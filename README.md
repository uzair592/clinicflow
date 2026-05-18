# ClinicFlow - AI Clinic Management + Smart Diagnosis SaaS

A MERN clinic automation system built for the hackathon requirements. It digitizes patient records, appointments, prescriptions, medical history, analytics, subscriptions, and AI-assisted diagnosis workflows.

## Core Features

- JWT authentication with role-based dashboards
- Roles: Admin, Doctor, Receptionist, Patient
- Patient CRUD with linked patient accounts
- Appointment booking, confirmation, cancellation, and completion
- Diagnosis logs with symptoms, risk level, suggested tests, and timeline tracking
- Prescription creation with medicine dosage/frequency/duration
- Prescription PDF download for patients and doctors
- AI symptom checker with graceful fallback
- AI prescription explanation with graceful fallback
- Admin analytics with Recharts
- Simulated Free/Pro subscription access
- Audit logs and AI usage monitoring

## Tech Stack

- MongoDB + Mongoose
- Express.js + Node.js
- React + Vite
- JWT authentication
- Zustand auth state
- React Hook Form + Zod validation
- Recharts
- Gemini AI integration
- PDFKit

## Local Setup

1. Install backend dependencies:

```bash
npm install
```

2. Install frontend dependencies:

```bash
cd client
npm install
```

3. Create `.env` in the root:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_uri
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
GEMINI_API_KEY=your_gemini_key
CLIENT_URL=http://localhost:5173
```

4. Start backend:

```bash
npm start
```

5. Start frontend:

```bash
cd client
npm run dev
```

Frontend runs at `http://localhost:5173`.
Backend runs at `http://localhost:5000`.

## Vercel Deployment

This repo can deploy the frontend on Vercel as a static React app. The backend is not deployed automatically by Vercel in the current structure and should be hosted separately.

### Deploy frontend to Vercel

- In Vercel, import this GitHub repo.
- Set the project root to `client`.
- Set Build Command to `npm install && npm run build`.
- Set Output Directory to `dist`.
- Add an environment variable `VITE_API_URL` pointing to your backend API base URL, for example `https://your-backend.example.com/api/v1`.

### If you deploy from the repo root

The existing root `vercel.json` is configured to build the client from `client/` and publish `client/dist` as a static site.

### Important

- The backend currently runs from `server.js` and is not Vercel-compatible without refactoring into serverless API routes.
- For full functionality, host the backend separately and point `VITE_API_URL` to it.

## Render Deployment

This repository is now configured to deploy the full stack as one Render web service.

- Render service root: repository root
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Environment variables:
  - `NODE_ENV=production`
  - `PORT=10000`
  - `MONGO_URI`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `JWT_ACCESS_EXPIRE=15m`
  - `JWT_REFRESH_EXPIRE=7d`
  - `CLIENT_URL=https://<your-render-service-url>`
  - `GEMINI_API_KEY`

The `render.yaml` file already declares these settings for a free Render web service.

## Demo Flow

1. Register an admin with Pro plan.
2. From Admin Dashboard, create doctors and receptionists.
3. Login as receptionist and register patients/book appointments.
4. Login as doctor and complete appointments, add diagnosis logs, write prescriptions, and run AI symptom checks.
5. Login as patient to view profile, appointment history, diagnosis/prescription timeline, download prescription PDFs, and request AI prescription explanations.
6. Return to admin to view analytics and system logs.

## Verification

```bash
npm run test
cd client && npm run lint && npm run build
```

The backend also supports the included Postman collection for API testing.
