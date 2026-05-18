const express = require('express');
const { getAttendance, upsertAttendance } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(protect);
router.use(allowRoles('admin'));

router.get('/', getAttendance);
router.post('/', upsertAttendance);

module.exports = router;
