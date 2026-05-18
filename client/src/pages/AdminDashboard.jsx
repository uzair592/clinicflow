import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Brain, CreditCard, Edit3, Stethoscope, Trash2, Users } from 'lucide-react';
import api from '../api/axios';
import Timeline from '../components/Timeline';

const emptyStaff = {
  name: '',
  email: '',
  password: '',
  role: 'doctor',
  subscriptionPlan: 'free',
  phone: '',
  education: '',
  specialty: '',
  salary: '',
  shift: 'morning',
  shiftStart: '09:00',
  shiftEnd: '17:00'
};

const monthName = (month) => new Date(2026, month - 1, 1).toLocaleString('default', { month: 'short' });

const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [patients, setPatients] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [staffForm, setStaffForm] = useState(emptyStaff);
  const [editingUser, setEditingUser] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [attendanceForm, setAttendanceForm] = useState({
    userId: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'present',
    checkIn: '09:00',
    checkOut: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setMessage('');
    try {
      const [patientRes, userRes, planRes, appointmentRes, prescriptionRes, diagnosisRes, attendanceRes] = await Promise.all([
        api.get('/patients'),
        api.get('/users?includeInactive=true'),
        api.get('/subscriptions/plans').catch(() => ({ data: { data: [] } })),
        api.get('/appointments'),
        api.get('/prescriptions'),
        api.get('/diagnosis-logs'),
        api.get('/attendance')
      ]);

      setPatients(patientRes.data.data || []);
      setUsers(userRes.data.data || []);
      setPlans(planRes.data.data || []);
      setAppointments(appointmentRes.data.data || []);
      setPrescriptions(prescriptionRes.data.data || []);
      setDiagnoses(diagnosisRes.data.data || []);
      setAttendance(attendanceRes.data.data || []);

      try {
        const analyticsRes = await api.get('/analytics/summary');
        setSummary(analyticsRes.data.data);
      } catch (error) {
        setSummary(null);
        setMessage(error.response?.data?.message || 'Advanced analytics require a Pro plan.');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const doctors = users.filter((user) => user.role === 'doctor');
  const receptionists = users.filter((user) => user.role === 'receptionist');
  const staff = [...doctors, ...receptionists];
  const revenue = users.filter((user) => user.subscriptionPlan === 'pro').length * 29;
  const selectedPatient = patients.find((patient) => patient._id === selectedPatientId) || patients[0];
  const chartData = useMemo(() => (
    (summary?.appointmentsPerMonth || []).map((item) => ({
      name: monthName(item._id?.month || item.month),
      count: item.count
    }))
  ), [summary]);
  const patientTimeline = useMemo(() => buildPatientTimeline(selectedPatient, appointments, prescriptions, diagnoses), [selectedPatient, appointments, prescriptions, diagnoses]);

  const createStaff = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await api.post('/users', staffForm);
      setStaffForm(emptyStaff);
      setMessage('Staff user created successfully.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to create staff user.');
    }
  };

  const saveUser = async () => {
    try {
      const payload = { ...editingUser };
      delete payload._id;
      delete payload.email;
      await api.put(`/users/${editingUser._id}`, payload);
      setEditingUser(null);
      setMessage('User details updated.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update user.');
    }
  };

  const deactivateUser = async (userId) => {
    try {
      await api.delete(`/users/${userId}`);
      setMessage('User deactivated.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to deactivate user.');
    }
  };

  const savePatient = async () => {
    try {
      await api.put(`/patients/${editingPatient._id}`, editingPatient);
      setEditingPatient(null);
      setMessage('Patient details updated.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update patient.');
    }
  };

  const deletePatient = async (patientId) => {
    try {
      await api.delete(`/patients/${patientId}`);
      setMessage('Patient deleted.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to delete patient.');
    }
  };

  const markAttendance = async (event) => {
    event.preventDefault();
    try {
      await api.post('/attendance', attendanceForm);
      setAttendanceForm({ ...attendanceForm, userId: '', notes: '' });
      setMessage('Attendance saved.');
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save attendance.');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      {message && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric icon={Users} label="Patients" value={patients.length} tone="blue" />
        <Metric icon={Stethoscope} label="Doctors" value={doctors.filter((item) => item.isActive).length} tone="emerald" />
        <Metric icon={Brain} label="AI Calls" value={summary?.aiCallsPerDay?.reduce((sum, item) => sum + item.count, 0) || 0} tone="violet" />
        <Metric icon={CreditCard} label="Revenue" value={`$${revenue}`} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Monthly Appointments</h2>
            <Activity className="h-5 w-5 text-slate-400" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Common Symptoms</h2>
          <div className="space-y-3">
            {(summary?.topDiagnoses || []).length === 0 && <p className="text-sm text-slate-500">No diagnosis data yet.</p>}
            {(summary?.topDiagnoses || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm capitalize text-slate-700">{item._id}</span>
                <span className="text-sm font-semibold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <StaffCreateForm form={staffForm} setForm={setStaffForm} onSubmit={createStaff} />

      <StaffSection title="Doctors" users={doctors} plans={plans} attendance={attendance} onEdit={setEditingUser} onDelete={deactivateUser} />
      <StaffSection title="Receptionists" users={receptionists} plans={plans} attendance={attendance} onEdit={setEditingUser} onDelete={deactivateUser} />

      <AttendanceSection form={attendanceForm} setForm={setAttendanceForm} staff={staff} attendance={attendance} onSubmit={markAttendance} />

      <PatientsSection patients={patients} doctors={doctors} onEdit={setEditingPatient} onDelete={deletePatient} />

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Patient History</h2>
          <select value={selectedPatient?._id || ''} onChange={(event) => setSelectedPatientId(event.target.value)} className="input max-w-xs">
            {patients.map((patient) => <option key={patient._id} value={patient._id}>{patient.name}</option>)}
          </select>
        </div>
        {selectedPatient ? <Timeline events={patientTimeline} /> : <p className="text-sm text-slate-500">No patient selected.</p>}
      </section>

      {editingUser && (
        <EditUserPanel user={editingUser} setUser={setEditingUser} plans={plans} onSave={saveUser} onCancel={() => setEditingUser(null)} />
      )}

      {editingPatient && (
        <EditPatientPanel patient={editingPatient} setPatient={setEditingPatient} doctors={doctors} onSave={savePatient} onCancel={() => setEditingPatient(null)} />
      )}
    </div>
  );
};

const buildPatientTimeline = (patient, appointments, prescriptions, diagnoses) => {
  if (!patient) return [];

  const patientId = patient._id;
  const appointmentEvents = appointments
    .filter((item) => item.patientId?._id === patientId || item.patientId === patientId)
    .map((item) => ({
      date: item.date,
      type: 'appointment',
      title: `Appointment with Dr. ${item.doctorId?.name || 'Unknown'}`,
      description: `${item.status} · ${item.timeSlot}`
    }));
  const prescriptionEvents = prescriptions
    .filter((item) => item.patientId?._id === patientId || item.patientId === patientId)
    .map((item) => ({
      date: item.createdAt,
      type: 'prescription',
      title: 'Prescription Issued',
      description: `${item.medicines?.length || 0} medicine(s)`
    }));
  const diagnosisEvents = diagnoses
    .filter((item) => item.patientId?._id === patientId || item.patientId === patientId)
    .map((item) => ({
      date: item.createdAt,
      type: 'diagnosis',
      title: `Diagnosis (${item.riskLevel || 'low'} risk)`,
      description: (item.symptoms || []).join(', ')
    }));

  return [...appointmentEvents, ...prescriptionEvents, ...diagnosisEvents].sort((a, b) => new Date(b.date) - new Date(a.date));
};

const StaffCreateForm = ({ form, setForm, onSubmit }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-6">
    <h2 className="mb-4 text-lg font-semibold text-slate-800">Add Doctor or Receptionist</h2>
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Input label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
      <Input label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
      <Input label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} required />
      <Select label="Role" value={form.role} onChange={(value) => setForm({ ...form, role: value })} options={['doctor', 'receptionist', 'admin']} />
      <Input label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
      <Input label="Education" value={form.education} onChange={(value) => setForm({ ...form, education: value })} placeholder="MBBS, FCPS" />
      <Input label="Specialty" value={form.specialty} onChange={(value) => setForm({ ...form, specialty: value })} placeholder="Radiology, Urology" />
      <Input label="Salary" type="number" value={form.salary} onChange={(value) => setForm({ ...form, salary: value })} />
      <Select label="Shift" value={form.shift} onChange={(value) => setForm({ ...form, shift: value })} options={['morning', 'evening', 'night', 'flexible']} />
      <Input label="Shift Start" type="time" value={form.shiftStart} onChange={(value) => setForm({ ...form, shiftStart: value })} />
      <Input label="Shift End" type="time" value={form.shiftEnd} onChange={(value) => setForm({ ...form, shiftEnd: value })} />
      <Select label="Plan" value={form.subscriptionPlan} onChange={(value) => setForm({ ...form, subscriptionPlan: value })} options={['free', 'pro']} />
      <button className="rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 md:col-span-4">Create Staff Account</button>
    </form>
  </section>
);

const StaffSection = ({ title, users, plans, attendance, onEdit, onDelete }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-6">
    <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-3">Name</th>
            <th className="px-3 py-3">Specialty</th>
            <th className="px-3 py-3">Education</th>
            <th className="px-3 py-3">Salary</th>
            <th className="px-3 py-3">Shift</th>
            <th className="px-3 py-3">Attendance</th>
            <th className="px-3 py-3">Plan</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.length === 0 && <tr><td className="px-3 py-4 text-slate-500" colSpan="9">No records.</td></tr>}
          {users.map((user) => {
            const latest = attendance.find((item) => item.userId?._id === user._id);
            return (
              <tr key={user._id}>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-800">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </td>
                <td className="px-3 py-3 text-slate-600">{user.specialty || 'Not set'}</td>
                <td className="px-3 py-3 text-slate-600">{user.education || 'Not set'}</td>
                <td className="px-3 py-3 text-slate-600">{Number(user.salary || 0).toLocaleString()}</td>
                <td className="px-3 py-3 capitalize text-slate-600">{user.shift || 'morning'} {user.shiftStart && user.shiftEnd ? `(${user.shiftStart}-${user.shiftEnd})` : ''}</td>
                <td className="px-3 py-3 capitalize text-slate-600">{latest ? `${latest.status} · ${new Date(latest.date).toLocaleDateString()}` : 'Not marked'}</td>
                <td className="px-3 py-3">{plans.find((plan) => plan.name === user.subscriptionPlan)?.name || user.subscriptionPlan}</td>
                <td className="px-3 py-3">{user.isActive ? 'Active' : 'Inactive'}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(user)} className="rounded-md bg-blue-50 p-2 text-blue-700" title="Edit"><Edit3 className="h-4 w-4" /></button>
                    {user.isActive && <button onClick={() => onDelete(user._id)} className="rounded-md bg-red-50 p-2 text-red-700" title="Deactivate"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
);

const AttendanceSection = ({ form, setForm, staff, attendance, onSubmit }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-6">
    <h2 className="mb-4 text-lg font-semibold text-slate-800">Doctor & Receptionist Attendance</h2>
    <form onSubmit={onSubmit} className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-6">
      <label className="block md:col-span-2">
        <span className="mb-1 block text-sm font-medium text-slate-700">Staff</span>
        <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="input" required>
          <option value="">Select staff</option>
          {staff.filter((item) => item.isActive).map((item) => <option key={item._id} value={item._id}>{item.name} ({item.role})</option>)}
        </select>
      </label>
      <Input label="Date" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} required />
      <Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={['present', 'absent', 'late', 'leave']} />
      <Input label="Check In" type="time" value={form.checkIn} onChange={(value) => setForm({ ...form, checkIn: value })} />
      <Input label="Check Out" type="time" value={form.checkOut} onChange={(value) => setForm({ ...form, checkOut: value })} />
      <label className="block md:col-span-5">
        <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
      </label>
      <button className="rounded-lg bg-slate-900 py-2.5 font-medium text-white hover:bg-slate-800">Save</button>
    </form>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {attendance.slice(0, 8).map((item) => (
        <div key={item._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="font-medium text-slate-800">{item.userId?.name}</p>
          <p className="text-sm capitalize text-slate-500">{item.role} · {item.status}</p>
          <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString()} {item.checkIn ? `· ${item.checkIn}` : ''}</p>
        </div>
      ))}
    </div>
  </section>
);

const PatientsSection = ({ patients, doctors, onEdit, onDelete }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-6">
    <h2 className="mb-4 text-lg font-semibold text-slate-800">Patients</h2>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-3">Patient</th>
            <th className="px-3 py-3">Age</th>
            <th className="px-3 py-3">Gender</th>
            <th className="px-3 py-3">Contact</th>
            <th className="px-3 py-3">Doctor</th>
            <th className="px-3 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {patients.length === 0 && <tr><td className="px-3 py-4 text-slate-500" colSpan="6">No patients.</td></tr>}
          {patients.map((patient) => (
            <tr key={patient._id}>
              <td className="px-3 py-3 font-medium text-slate-800">{patient.name}</td>
              <td className="px-3 py-3 text-slate-600">{patient.age}</td>
              <td className="px-3 py-3 capitalize text-slate-600">{patient.gender}</td>
              <td className="px-3 py-3 text-slate-600">{patient.contact}</td>
              <td className="px-3 py-3 text-slate-600">{doctors.find((doctor) => doctor._id === patient.assignedDoctor)?.name || 'Unassigned'}</td>
              <td className="px-3 py-3">
                <div className="flex gap-2">
                  <button onClick={() => onEdit(patient)} className="rounded-md bg-blue-50 p-2 text-blue-700" title="Edit"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => onDelete(patient._id)} className="rounded-md bg-red-50 p-2 text-red-700" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

const EditUserPanel = ({ user, setUser, plans, onSave, onCancel }) => (
  <section className="rounded-lg border border-blue-200 bg-blue-50 p-6">
    <h2 className="mb-4 text-lg font-semibold text-slate-800">Edit Staff Details</h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Input label="Name" value={user.name || ''} onChange={(value) => setUser({ ...user, name: value })} />
      <Input label="Phone" value={user.phone || ''} onChange={(value) => setUser({ ...user, phone: value })} />
      <Input label="Education" value={user.education || ''} onChange={(value) => setUser({ ...user, education: value })} />
      <Input label="Specialty" value={user.specialty || ''} onChange={(value) => setUser({ ...user, specialty: value })} />
      <Input label="Salary" type="number" value={user.salary || ''} onChange={(value) => setUser({ ...user, salary: value })} />
      <Select label="Shift" value={user.shift || 'morning'} onChange={(value) => setUser({ ...user, shift: value })} options={['morning', 'evening', 'night', 'flexible']} />
      <Input label="Shift Start" type="time" value={user.shiftStart || ''} onChange={(value) => setUser({ ...user, shiftStart: value })} />
      <Input label="Shift End" type="time" value={user.shiftEnd || ''} onChange={(value) => setUser({ ...user, shiftEnd: value })} />
      <Select label="Plan" value={user.subscriptionPlan || 'free'} onChange={(value) => setUser({ ...user, subscriptionPlan: value })} options={(plans.length ? plans : [{ name: 'free' }, { name: 'pro' }]).map((plan) => plan.name)} />
      <Select label="Status" value={user.isActive ? 'active' : 'inactive'} onChange={(value) => setUser({ ...user, isActive: value === 'active' })} options={['active', 'inactive']} />
      <div className="flex items-end gap-2 md:col-span-2">
        <button onClick={onSave} className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700">Save Changes</button>
        <button onClick={onCancel} className="rounded-lg bg-white px-4 py-2.5 font-medium text-slate-700 ring-1 ring-slate-200">Cancel</button>
      </div>
    </div>
  </section>
);

const EditPatientPanel = ({ patient, setPatient, doctors, onSave, onCancel }) => (
  <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
    <h2 className="mb-4 text-lg font-semibold text-slate-800">Edit Patient Details</h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Input label="Name" value={patient.name || ''} onChange={(value) => setPatient({ ...patient, name: value })} />
      <Input label="Age" type="number" value={patient.age || ''} onChange={(value) => setPatient({ ...patient, age: value })} />
      <Select label="Gender" value={patient.gender || 'male'} onChange={(value) => setPatient({ ...patient, gender: value })} options={['male', 'female', 'other']} />
      <Input label="Contact" value={patient.contact || ''} onChange={(value) => setPatient({ ...patient, contact: value })} />
      <Input label="Blood Group" value={patient.bloodGroup || ''} onChange={(value) => setPatient({ ...patient, bloodGroup: value })} />
      <label className="block md:col-span-2">
        <span className="mb-1 block text-sm font-medium text-slate-700">Assigned Doctor</span>
        <select value={patient.assignedDoctor || ''} onChange={(e) => setPatient({ ...patient, assignedDoctor: e.target.value })} className="input">
          <option value="">Unassigned</option>
          {doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name}</option>)}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button onClick={onSave} className="rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-700">Save</button>
        <button onClick={onCancel} className="rounded-lg bg-white px-4 py-2.5 font-medium text-slate-700 ring-1 ring-slate-200">Cancel</button>
      </div>
    </div>
  </section>
);

const Input = ({ label, value, onChange, type = 'text', required = false, placeholder = '' }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="input" required={required} placeholder={placeholder} />
  </label>
);

const Select = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="input">
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
);

const Metric = ({ icon: Icon, label, value, tone }) => {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700'
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div className={`rounded-lg p-3 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
};

export default AdminDashboard;
