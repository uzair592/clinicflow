const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const xss = require('xss');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const doctorAvailabilityRoutes = require('./routes/doctorAvailabilityRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const diagnosisLogRoutes = require('./routes/diagnosisLogRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const userRoutes = require('./routes/userRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const logger = require('./utils/logger');

// Load env vars
dotenv.config();

const app = express();

// Enable CORS — must be first so preflight OPTIONS requests succeed
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Set security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// XSS protection via body sanitization
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        const sanitize = (obj) => {
            if (typeof obj === 'string') return xss(obj);
            if (typeof obj === 'object' && obj !== null) {
                Object.keys(obj).forEach(k => { obj[k] = sanitize(obj[k]); });
            }
            return obj;
        };
        req.body = sanitize(req.body);
    }
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 mins
    max: 200 // 200 requests per 10 mins
});
app.use(limiter);

// Prevent MongoDB operator injection without assigning to Express 5 getter-backed req.query.
app.use((req, res, next) => {
    const sanitizeMongo = (value) => {
        if (!value || typeof value !== 'object') return value;

        Object.keys(value).forEach((key) => {
            const cleanKey = key.replace(/\$/g, '').replace(/\./g, '');
            const childValue = sanitizeMongo(value[key]);

            if (cleanKey !== key) {
                delete value[key];
                value[cleanKey] = childValue;
            } else {
                value[key] = childValue;
            }
        });

        return value;
    };

    sanitizeMongo(req.body);
    sanitizeMongo(req.params);
    sanitizeMongo(req.query);
    next();
});

// Mount routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/doctor-availability', doctorAvailabilityRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/diagnosis-logs', diagnosisLogRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/attendance', attendanceRoutes);

// Error handler (fallback)
app.use((err, req, res, next) => {
    logger.error(err.stack || err.message);
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(err.statusCode || 500).json({
        success: false,
        message: isProduction ? 'Server Error' : (err.message || 'Server Error'),
        data: null,
        error: isProduction ? null : (err.name || 'Error')
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));
};

startServer();
