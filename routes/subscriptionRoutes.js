const express = require('express');
const {
    getPlans,
    seedDefaultPlans,
    updateUserPlan
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.get('/plans', getPlans);

router.use(protect);
router.post('/seed', allowRoles('admin'), seedDefaultPlans);
router.put('/users/:userId/plan', allowRoles('admin'), updateUserPlan);

module.exports = router;
