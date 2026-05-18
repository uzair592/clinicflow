import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarPlus, Download, Sparkles, UserRound } from 'lucide-react';
import api from '../api/axios';
import Timeline from '../components/Timeline';
import AIResponse from '../components/AIResponse';

const appointmentSchema = z.object({
  doctorId: z.string().min(1, 'Choose a doctor'),
  date: z.string().min(1, 'Choose a date'),
  timeSlot: z.string().min(1, 'Choose a time slot'),
  notes: z.string().optional()
});

const PatientDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiExplanations, setAiExplanations] = useState({});

  const appointmentForm = useForm({ resolver: zodResolver(appointmentSchema) });

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientRes, doctorRes, appointmentRes, prescriptionRes, diagnosisRes] = await Promise.all([
        api.get('/patients'),
        api.get('/users?role=doctor'),
        api.get('/appointments'),
        api.get('/prescriptions'),
        api.get('/diagnosis-logs')
      ]);
      setProfile((patientRes.data.data || [])[0] || null);
      setDoctors(doctorRes.data.data || []);
      setAppointments(appointmentRes.data.data || []);
      setPrescriptions(prescriptionRes.data.data || []);
      setDiagnoses(diagnosisRes.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load patient portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const timelineEvents = useMemo(() => {
    const appointmentEvents = appointments.map((appointment) => ({
      date: appointment.date,
      type: 'appointment',
      title: `Appointment with Dr. ${appointment.doctorId?.name || 'Unknown'}`,
      description: `${appointment.status} · ${appointment.timeSlot}`
    }));

    const prescriptionEvents = prescriptions.map((prescription) => ({
      date: prescription.createdAt,
      type: 'prescription',
      title: 'Prescription Issued',
      description: `${prescription.medicines?.length || 0} medicine(s) prescribed.`
    }));

    const diagnosisEvents = diagnoses.map((diagnosis) => ({
      date: diagnosis.createdAt,
      type: 'diagnosis',
      title: `Diagnosis Logged (${diagnosis.riskLevel || 'low'} risk)`,
      description: (diagnosis.symptoms || []).join(', ')
    }));

    return [...appointmentEvents, ...prescriptionEvents, ...diagnosisEvents].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [appointments, prescriptions, diagnoses]);

  const bookAppointment = async (data) => {
    try {
      await api.post('/appointments', data);
      appointmentForm.reset();
      setMessage('Appointment request submitted.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to book appointment.');
    }
  };

  const handleDownloadPdf = async (id) => {
    try {
      const response = await api.get(`/prescriptions/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to download PDF.');
    }
  };

  const handleExplain = async (id) => {
    setAiLoadingId(id);
    try {
      const response = await api.post(`/ai/explain-prescription/${id}`);
      setAiExplanations((prev) => ({ ...prev, [id]: response.data.data.explanation }));
    } catch (error) {
      setAiExplanations((prev) => ({
        ...prev,
        [id]: { fallback: true, message: error.response?.data?.message || 'AI explanation unavailable. Ask your doctor or pharmacist for clarification.' }
      }));
    } finally {
      setAiLoadingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading patient portal...</div>;

  return (
    <div className="space-y-6">
      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <UserRound className="h-5 w-5 text-blue-600" /> My Profile
          </h2>
          {profile ? (
            <div className="space-y-3 text-sm">
              <ProfileRow label="Name" value={profile.name} />
              <ProfileRow label="Age" value={profile.age} />
              <ProfileRow label="Gender" value={profile.gender} />
              <ProfileRow label="Contact" value={profile.contact} />
              <ProfileRow label="Blood Group" value={profile.bloodGroup || 'Not set'} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">No linked patient profile found. Register as a patient with age, gender, and contact details.</p>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 xl:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CalendarPlus className="h-5 w-5 text-emerald-600" /> Book Appointment
          </h2>
          <form onSubmit={appointmentForm.handleSubmit(bookAppointment)} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Doctor" error={appointmentForm.formState.errors.doctorId?.message}>
              <select {...appointmentForm.register('doctorId')} className="input">
                <option value="">Select doctor</option>
                {doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name}</option>)}
              </select>
            </Field>
            <Field label="Date" error={appointmentForm.formState.errors.date?.message}>
              <input type="date" {...appointmentForm.register('date')} className="input" />
            </Field>
            <Field label="Time Slot" error={appointmentForm.formState.errors.timeSlot?.message}>
              <input {...appointmentForm.register('timeSlot')} className="input" placeholder="02:30 PM" />
            </Field>
            <Field label="Notes">
              <input {...appointmentForm.register('notes')} className="input" placeholder="Optional" />
            </Field>
            <button className="rounded-lg bg-slate-900 py-2.5 font-medium text-white hover:bg-slate-800 md:col-span-4">Request Appointment</button>
          </form>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-6 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Medical History Timeline</h2>
          <Timeline events={timelineEvents} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Prescriptions</h2>
          <div className="space-y-4">
            {prescriptions.length === 0 && <p className="text-sm text-slate-500">No prescriptions found.</p>}
            {prescriptions.map((prescription) => (
              <div key={prescription._id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{new Date(prescription.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">Dr. {prescription.doctorId?.name || 'Unknown'}</p>
                  </div>
                  <button onClick={() => handleDownloadPdf(prescription._id)} className="rounded-md bg-blue-50 p-2 text-blue-700" title="Download PDF">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
                <ul className="mb-3 space-y-1 text-xs text-slate-600">
                  {(prescription.medicines || []).map((medicine, index) => (
                    <li key={`${medicine.name}-${index}`}>{medicine.name} · {medicine.dosage} · {medicine.frequency}</li>
                  ))}
                </ul>
                {!aiExplanations[prescription._id] && aiLoadingId !== prescription._id && (
                  <button onClick={() => handleExplain(prescription._id)} className="flex w-full items-center justify-center gap-1 rounded-lg bg-violet-100 py-2 text-xs font-medium text-violet-700 hover:bg-violet-200">
                    <Sparkles className="h-3.5 w-3.5" /> Explain with AI
                  </button>
                )}
                {aiLoadingId === prescription._id && <div className="mt-3"><AIResponse isLoading /></div>}
                {aiExplanations[prescription._id] && <div className="mt-3"><AIResponse response={aiExplanations[prescription._id]} /></div>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const ProfileRow = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium capitalize text-slate-900">{value}</span>
  </div>
);

const Field = ({ label, error, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
  </label>
);

export default PatientDashboard;
