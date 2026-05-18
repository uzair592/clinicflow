const express = require('express');
const {
    register,
    login,
    refreshToken,
    logout,
    getMe,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/refresh-token', refreshToken);
router.get('/logout', logout);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

router.get('/me', protect, getMe);
router.get('/admin-only', protect, allowRoles('admin'), (req, res) => {
    res.status(200).json({ success: true, message: 'Admin access granted', data: null, error: null });
});

module.exports = router;
