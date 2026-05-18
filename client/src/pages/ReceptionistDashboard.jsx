import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarPlus, CheckCircle2, UserPlus } from 'lucide-react';
import api from '../api/axios';

const patientSchema = z.object({
  name: z.string().min(2, 'Name required'),
  age: z.coerce.number().min(0, 'Invalid age'),
  gender: z.enum(['male', 'female', 'other']),
  contact: z.string().min(10, 'Valid contact required'),
  bloodGroup: z.string().optional(),
  assignedDoctor: z.string().optional()
});

const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Choose a patient'),
  doctorId: z.string().min(1, 'Choose a doctor'),
  date: z.string().min(1, 'Choose a date'),
  timeSlot: z.string().min(1, 'Choose a time slot'),
  notes: z.string().optional()
});

const ReceptionistDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const patientForm = useForm({ resolver: zodResolver(patientSchema), defaultValues: { gender: 'male' } });
  const appointmentForm = useForm({ resolver: zodResolver(appointmentSchema) });

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientRes, doctorRes, appointmentRes] = await Promise.all([
        api.get('/patients'),
        api.get('/users?role=doctor'),
        api.get('/appointments')
      ]);
      setPatients(patientRes.data.data || []);
      setDoctors(doctorRes.data.data || []);
      setAppointments(appointmentRes.data.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load front desk data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const createPatient = async (data) => {
    setMessage('');
    try {
      await api.post('/patients', { ...data, assignedDoctor: data.assignedDoctor || undefined });
      patientForm.reset({ gender: 'male' });
      setMessage('Patient registered successfully.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to register patient.');
    }
  };

  const createAppointment = async (data) => {
    setMessage('');
    try {
      await api.post('/appointments', data);
      appointmentForm.reset();
      setMessage('Appointment booked successfully.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to book appointment.');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/appointments/${id}`, { status });
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update appointment.');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading front desk...</div>;

  return (
    <div className="space-y-6">
      {message && <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <UserPlus className="h-5 w-5 text-blue-600" /> Quick Patient Registration
          </h2>
          <form onSubmit={patientForm.handleSubmit(createPatient)} className="grid grid-cols-2 gap-4">
            <Field label="Full Name" error={patientForm.formState.errors.name?.message} className="col-span-2">
              <input {...patientForm.register('name')} className="input" />
            </Field>
            <Field label="Age" error={patientForm.formState.errors.age?.message}>
              <input type="number" {...patientForm.register('age')} className="input" />
            </Field>
            <Field label="Gender" error={patientForm.formState.errors.gender?.message}>
              <select {...patientForm.register('gender')} className="input">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Contact" error={patientForm.formState.errors.contact?.message}>
              <input {...patientForm.register('contact')} className="input" />
            </Field>
            <Field label="Blood Group">
              <input {...patientForm.register('bloodGroup')} className="input" />
            </Field>
            <Field label="Assign Doctor" className="col-span-2">
              <select {...patientForm.register('assignedDoctor')} className="input">
                <option value="">Unassigned</option>
                {doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name}</option>)}
              </select>
            </Field>
            <button type="submit" disabled={patientForm.formState.isSubmitting} className="col-span-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {patientForm.formState.isSubmitting ? 'Registering...' : 'Register Patient'}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-800">
            <CalendarPlus className="h-5 w-5 text-emerald-600" /> Book Appointment
          </h2>
          <form onSubmit={appointmentForm.handleSubmit(createAppointment)} className="grid grid-cols-2 gap-4">
            <Field label="Patient" error={appointmentForm.formState.errors.patientId?.message} className="col-span-2">
              <select {...appointmentForm.register('patientId')} className="input">
                <option value="">Select patient</option>
                {patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name}</option>)}
              </select>
            </Field>
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
              <input {...appointmentForm.register('timeSlot')} className="input" placeholder="10:30 AM" />
            </Field>
            <Field label="Notes">
              <input {...appointmentForm.register('notes')} className="input" placeholder="Optional" />
            </Field>
            <button type="submit" disabled={appointmentForm.formState.isSubmitting} className="col-span-2 rounded-lg bg-slate-900 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              {appointmentForm.formState.isSubmitting ? 'Booking...' : 'Book Appointment'}
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Daily Schedule</h2>
        <div className="space-y-3">
          {appointments.length === 0 && <p className="text-sm text-slate-500">No appointments yet.</p>}
          {appointments.map((appointment) => (
            <div key={appointment._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="font-medium text-slate-900">{appointment.patientId?.name || 'Unknown patient'}</p>
                <p className="text-sm text-slate-500">Dr. {appointment.doctorId?.name || 'Unassigned'} · {new Date(appointment.date).toLocaleDateString()} · {appointment.timeSlot}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={appointment.status} />
                {appointment.status === 'pending' && <button onClick={() => updateStatus(appointment._id, 'confirmed')} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">Confirm</button>}
                {appointment.status !== 'cancelled' && appointment.status !== 'completed' && <button onClick={() => updateStatus(appointment._id, 'cancelled')} className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">Cancel</button>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const Field = ({ label, error, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
  </label>
);

const StatusBadge = ({ status }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-slate-700 ring-1 ring-slate-200">
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {status}
  </span>
);

export default ReceptionistDashboard;
