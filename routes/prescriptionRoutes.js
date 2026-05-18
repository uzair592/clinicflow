const express = require('express');
const {
    createPrescription,
    getPrescriptions,
    getPrescription,
    updatePrescription,
    deletePrescription,
    downloadPrescriptionPdf
} = require('../controllers/prescriptionController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getPrescriptions)
    .post(allowRoles('admin', 'doctor'), createPrescription);

router
    .route('/:id')
    .get(getPrescription)
    .put(allowRoles('admin', 'doctor'), updatePrescription)
    .delete(allowRoles('admin', 'doctor'), deletePrescription);

router.get('/:id/pdf', allowRoles('patient', 'doctor'), downloadPrescriptionPdf);

module.exports = router;
