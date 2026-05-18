import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import useAuthStore from '../store/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import api from '../api/axios';

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(['patient', 'doctor', 'receptionist', 'admin']),
  subscriptionPlan: z.enum(['free', 'pro']),
  age: z.coerce.number().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  contact: z.string().optional(),
  bloodGroup: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.role !== 'patient') return;

  if (data.age === undefined || Number.isNaN(data.age) || data.age < 0) {
    ctx.addIssue({ code: 'custom', path: ['age'], message: 'Age is required for patients' });
  }
  if (!data.gender) {
    ctx.addIssue({ code: 'custom', path: ['gender'], message: 'Gender is required for patients' });
  }
  if (!data.contact || data.contact.length < 10) {
    ctx.addIssue({ code: 'custom', path: ['contact'], message: 'Valid contact is required for patients' });
  }
});

const Register = () => {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'patient',
      subscriptionPlan: 'free',
      gender: 'male'
    }
  });
  const selectedRole = useWatch({ control, name: 'role' });

  const onSubmit = async (data) => {
    setApiError('');
    try {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        subscriptionPlan: data.subscriptionPlan,
        patientProfile: data.role === 'patient' ? {
          age: data.age,
          gender: data.gender,
          contact: data.contact,
          bloodGroup: data.bloodGroup
        } : undefined
      };

      const response = await api.post('/auth/register', payload);
      const { user, accessToken } = response.data.data;
      setAuth(user, accessToken);
      
      // Navigate based on role
      switch (user.role) {
        case 'admin': navigate('/admin/dashboard'); break;
        case 'doctor': navigate('/doctor/dashboard'); break;
        case 'receptionist': navigate('/receptionist/dashboard'); break;
        case 'patient': navigate('/patient/dashboard'); break;
        default: navigate('/');
      }
    } catch (error) {
      const serverErrors = error.response?.data?.data?.errors;
      setApiError(serverErrors?.join(', ') || error.response?.data?.message || 'Failed to register account');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">Clinic<span className="text-blue-500">Flow</span></h1>
          <p className="text-slate-500 mt-2">Create a new account</p>
        </div>

        {apiError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input 
              {...register('name')} 
              type="text" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="John Doe"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              {...register('email')} 
              type="email" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              {...register('password')} 
              type="password" 
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select {...register('role')} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
              <select {...register('subscriptionPlan')} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          </div>

          {selectedRole === 'patient' && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                <input type="number" {...register('age')} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select {...register('gender')} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                <input {...register('contact')} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                <input {...register('bloodGroup')} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Optional" />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 mt-4"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium transition">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
