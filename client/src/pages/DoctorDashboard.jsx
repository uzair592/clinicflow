import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FilePlus2, Stethoscope } from 'lucide-react';
import api from '../api/axios';
import AIResponse from '../components/AIResponse';

const diagnosisSchema = z.object({
  patientId: z.string().min(1, 'Choose a patient'),
  symptoms: z.string().min(3, 'Enter symptoms'),
  riskLevel: z.enum(['low', 'medium', 'high']),
  suggestedTests: z.string().optional()
});

const prescriptionSchema = z.object({
  patientId: z.string().min(1, 'Choose a patient'),
  medicineName: z.string().min(2, 'Medicine required'),
  dosage: z.string().min(1, 'Dosage required'),
  frequency: z.string().min(1, 'Frequency required'),
  duration: z.string().min(1, 'Duration required'),
  instructions: z.string().optional()
});

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const diagnosisForm = useForm({ resolver: zodResolver(diagnosisSchema), defaultValues: { riskLevel: 'low' } });
  const prescriptionForm = useForm({ resolver: zodResolver(prescriptionSchema) });
  const watchedPatientId = useWatch({ control: diagnosisForm.control, name: 'patientId' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [appointmentRes, patientRes, prescriptionRes, diagnosisRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/patients'),
        api.get('/prescriptions'),
        api.get('/diagnosis-logs')
      ]);
      setAppointments(appointmentRes.data.data || []);
      setPatients(patientRes.data.data || []);
      setPrescriptions(prescriptionRes.data.data || []);
      setDiagnoses(diagnosisRes.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load doctor workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const todayAppointments = useMemo(() => {
    const today = new Date().toDateString();
    return appointments.filter((appointment) => new Date(appointment.date).toDateString() === today);
  }, [appointments]);

  const selectedPatientId = watchedPatientId || patients[0]?._id;
  const selectedPatient = patients.find((patient) => patient._id === selectedPatientId);

  const handleSymptomCheck = async (event) => {
    event.preventDefault();
    setAiLoading(true);
    setAiResult(null);
    try {
      const symptomList = symptoms.split(',').map((item) => item.trim()).filter(Boolean);
      const res = await api.post('/ai/symptom-check', {
        symptoms: symptomList,
        age: selectedPatient?.age || 30,
        gender: selectedPatient?.gender || 'unknown',
        historyIds: diagnoses.filter((item) => item.patientId?._id === selectedPatient?._id).map((item) => item._id)
      });
      setAiResult(res.data.data);
    } catch (error) {
      setAiResult({ fallback: true, message: error.response?.data?.message || 'AI request failed. Continue manually.' });
    } finally {
      setAiLoading(false);
    }
  };

  const createDiagnosis = async (data) => {
    try {
      await api.post('/diagnosis-logs', {
        patientId: data.patientId,
        symptoms: data.symptoms.split(',').map((item) => item.trim()).filter(Boolean),
        riskLevel: data.riskLevel,
        suggestedTests: data.suggestedTests?.split(',').map((item) => item.trim()).filter(Boolean)
      });
      diagnosisForm.reset({ riskLevel: 'low' });
      setMessage('Diagnosis saved to patient history.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save diagnosis.');
    }
  };

  const createPrescription = async (data) => {
    try {
      await api.post('/prescriptions', {
        patientId: data.patientId,
        medicines: [{ name: data.medicineName, dosage: data.dosage, frequency: data.frequency, duration: data.duration }],
        instructions: data.instructions
      });
      prescriptionForm.reset();
      setMessage('Prescription created.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to create prescription.');
    }
  };

  const completeAppointment = async (id) => {
    try {
      await api.put(`/appointments/${id}`, { status: 'completed' });
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to complete appointment.');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading doctor dashboard...</div>;

  return (
    <div className="space-y-6">
      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Metric label="Today's Appointments" value={todayAppointments.length} />
        <Metric label="My Patients" value={patients.length} />
        <Metric label="Prescriptions" value={prescriptions.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-6 xl:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Schedule</h2>
          <div className="space-y-3">
            {appointments.length === 0 && <p className="text-sm text-slate-500">No appointments assigned.</p>}
            {appointments.slice(0, 8).map((appointment) => (
              <div key={appointment._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-medium text-slate-900">{appointment.patientId?.name || 'Unknown patient'}</p>
                  <p className="text-sm text-slate-500">{new Date(appointment.date).toLocaleDateString()} · {appointment.timeSlot} · {appointment.status}</p>
                </div>
                {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                  <button onClick={() => completeAppointment(appointment._id)} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">Complete</button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Stethoscope className="h-5 w-5 text-violet-600" /> AI Symptom Checker
          </h2>
          <form onSubmit={handleSymptomCheck} className="space-y-4">
            <select value={selectedPatientId || ''} onChange={(event) => diagnosisForm.setValue('patientId', event.target.value)} className="input">
              <option value="">Choose patient</option>
              {patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name}</option>)}
            </select>
            <textarea className="input min-h-24" placeholder="Fever, cough, chest pain" value={symptoms} onChange={(event) => setSymptoms(event.target.value)} required />
            <button type="submit" disabled={aiLoading || !symptoms} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">Analyze Symptoms</button>
          </form>
          <div className="mt-5">
            <AIResponse isLoading={aiLoading} response={aiResult} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Add Diagnosis</h2>
          <form onSubmit={diagnosisForm.handleSubmit(createDiagnosis)} className="grid grid-cols-2 gap-4">
            <Field label="Patient" error={diagnosisForm.formState.errors.patientId?.message} className="col-span-2">
              <select {...diagnosisForm.register('patientId')} className="input">
                <option value="">Choose patient</option>
                {patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name}</option>)}
              </select>
            </Field>
            <Field label="Symptoms" error={diagnosisForm.formState.errors.symptoms?.message} className="col-span-2">
              <input {...diagnosisForm.register('symptoms')} className="input" placeholder="Comma separated" />
            </Field>
            <Field label="Risk Level">
              <select {...diagnosisForm.register('riskLevel')} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
            <Field label="Suggested Tests">
              <input {...diagnosisForm.register('suggestedTests')} className="input" placeholder="CBC, X-ray" />
            </Field>
            <button className="col-span-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700">Save Diagnosis</button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <FilePlus2 className="h-5 w-5 text-emerald-600" /> Write Prescription
          </h2>
          <form onSubmit={prescriptionForm.handleSubmit(createPrescription)} className="grid grid-cols-2 gap-4">
            <Field label="Patient" error={prescriptionForm.formState.errors.patientId?.message} className="col-span-2">
              <select {...prescriptionForm.register('patientId')} className="input">
                <option value="">Choose patient</option>
                {patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name}</option>)}
              </select>
            </Field>
            <Field label="Medicine" error={prescriptionForm.formState.errors.medicineName?.message}>
              <input {...prescriptionForm.register('medicineName')} className="input" />
            </Field>
            <Field label="Dosage" error={prescriptionForm.formState.errors.dosage?.message}>
              <input {...prescriptionForm.register('dosage')} className="input" />
            </Field>
            <Field label="Frequency" error={prescriptionForm.formState.errors.frequency?.message}>
              <input {...prescriptionForm.register('frequency')} className="input" />
            </Field>
            <Field label="Duration" error={prescriptionForm.formState.errors.duration?.message}>
              <input {...prescriptionForm.register('duration')} className="input" />
            </Field>
            <Field label="Instructions" className="col-span-2">
              <textarea {...prescriptionForm.register('instructions')} className="input min-h-20" />
            </Field>
            <button className="col-span-2 rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700">Create Prescription</button>
          </form>
        </section>
      </div>
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-5">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const Field = ({ label, error, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
  </label>
);

export default DoctorDashboard;
