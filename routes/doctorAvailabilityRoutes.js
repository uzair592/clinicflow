const express = require('express');
const {
    createAvailability,
    getAvailabilities,
    getAvailability,
    updateAvailability,
    deleteAvailability
} = require('../controllers/doctorAvailabilityController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getAvailabilities)
    .post(allowRoles('admin', 'receptionist', 'doctor'), createAvailability);

router
    .route('/:id')
    .get(getAvailability)
    .put(allowRoles('admin', 'receptionist', 'doctor'), updateAvailability)
    .delete(allowRoles('admin', 'receptionist', 'doctor'), deleteAvailability);

module.exports = router;
