const express = require('express');
const { getAIRequestLogs, getAuditLogs } = require('../controllers/auditLogController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(protect);
router.use(allowRoles('admin'));

router.get('/', getAuditLogs);
router.get('/ai-requests', getAIRequestLogs);

module.exports = router;
