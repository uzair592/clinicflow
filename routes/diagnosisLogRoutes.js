const express = require('express');
const {
    createDiagnosisLog,
    getDiagnosisLogs,
    getDiagnosisLog,
    updateDiagnosisLog,
    deleteDiagnosisLog
} = require('../controllers/diagnosisLogController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(protect);

router
    .route('/')
    .get(getDiagnosisLogs)
    .post(allowRoles('admin', 'doctor'), createDiagnosisLog);

router
    .route('/:id')
    .get(getDiagnosisLog)
    .put(allowRoles('admin', 'doctor'), updateDiagnosisLog)
    .delete(allowRoles('admin', 'doctor'), deleteDiagnosisLog);

module.exports = router;
