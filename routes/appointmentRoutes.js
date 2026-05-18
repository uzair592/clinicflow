const express = require('express');
const {
    createAppointment,
    getAppointments,
    getAppointment,
    updateAppointment,
    deleteAppointment
} = require('../controllers/appointmentController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getAppointments)
    .post(allowRoles('admin', 'receptionist', 'patient'), createAppointment);

router
    .route('/:id')
    .get(getAppointment)
    .put(allowRoles('admin', 'receptionist', 'doctor'), updateAppointment)
    .delete(allowRoles('admin', 'receptionist'), deleteAppointment);

module.exports = router;
