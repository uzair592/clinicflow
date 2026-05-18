const express = require('express');
const {
    getAICallsPerDay,
    getAnalyticsSummary,
    getAppointmentsPerMonth,
    getPredictiveAppointments,
    getPrescriptionsPerDoctor,
    getTopDiagnoses
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');

const router = express.Router();

router.use(protect);
router.use(allowRoles('admin'));

router.get('/summary', checkSubscription('advancedAnalytics'), getAnalyticsSummary);
router.get('/appointments-per-month', checkSubscription('advancedAnalytics'), getAppointmentsPerMonth);
router.get('/top-diagnoses', checkSubscription('advancedAnalytics'), getTopDiagnoses);
router.get('/ai-calls-per-day', checkSubscription('advancedAnalytics'), getAICallsPerDay);
router.get('/prescriptions-per-doctor', checkSubscription('advancedAnalytics'), getPrescriptionsPerDoctor);
router.get('/predictive/appointments', checkSubscription('advancedAnalytics'), getPredictiveAppointments);

module.exports = router;
