const express = require('express');
const {
    createPatient,
    getPatients,
    getPatient,
    updatePatient,
    deletePatient
} = require('../controllers/patientController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');
const { enforcePatientLimit } = require('../middleware/subscriptionMiddleware');

const router = express.Router();

router.use(protect); // All routes protected

router
    .route('/')
    .get(getPatients)
    .post(allowRoles('admin', 'receptionist'), enforcePatientLimit, createPatient);

router
    .route('/:id')
    .get(getPatient)
    .put(allowRoles('admin', 'receptionist', 'doctor'), updatePatient)
    .delete(allowRoles('admin', 'receptionist'), deletePatient);

module.exports = router;
