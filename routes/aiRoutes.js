const express = require('express');
const { symptomCheck, explainPrescription } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');

const router = express.Router();

router.use(protect);

router.post('/symptom-check', allowRoles('doctor', 'receptionist'), checkSubscription('ai'), symptomCheck);
router.post('/explain-prescription/:id', allowRoles('patient', 'doctor'), checkSubscription('ai'), explainPrescription);

module.exports = router;
