const express = require('express');
const { createUser, deleteUser, getUsers, updateUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getUsers);
router.post('/', allowRoles('admin'), createUser);
router.put('/:id', allowRoles('admin'), updateUser);
router.delete('/:id', allowRoles('admin'), deleteUser);

module.exports = router;
