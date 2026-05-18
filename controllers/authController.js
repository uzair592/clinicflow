const User = require('../models/User');
const Patient = require('../models/Patient');
const sendResponse = require('../utils/response');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const allowedRoles = ['admin', 'doctor', 'receptionist', 'patient'];
const allowedPlans = ['free', 'pro', 'basic', 'premium'];
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const isValidEmail = (email) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(email);

const validateRegistration = ({ name, email, password, role, subscriptionPlan, patientProfile }) => {
    const errors = [];

    if (!name || String(name).trim().length < 2) errors.push('Name must be at least 2 characters');
    if (!email || !isValidEmail(email)) errors.push('Please provide a valid email address');
    if (!password || String(password).length < 6) errors.push('Password must be at least 6 characters');
    if (role && !allowedRoles.includes(role)) errors.push('Invalid role selected');
    if (subscriptionPlan && !allowedPlans.includes(subscriptionPlan)) errors.push('Invalid subscription plan selected');

    if ((role || 'patient') === 'patient') {
        if (!patientProfile || patientProfile.age === undefined || Number(patientProfile.age) < 0) {
            errors.push('Patient age is required');
        }
        if (!patientProfile?.gender || !['male', 'female', 'other'].includes(patientProfile.gender)) {
            errors.push('Patient gender is required');
        }
        if (!patientProfile?.contact || String(patientProfile.contact).trim().length < 10) {
            errors.push('Valid patient contact is required');
        }
    }

    return errors;
};

// Helper to generate tokens
const generateTokens = (id) => {
    const accessToken = jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRE
    });
    const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE
    });
    return { accessToken, refreshToken };
};

// Helper to send token response
const sendTokenResponse = (user, statusCode, res, message) => {
    const { accessToken, refreshToken } = generateTokens(user._id);

    const accessCookieOptions = {
        expires: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
        httpOnly: true
    };

    const refreshCookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        accessCookieOptions.secure = true;
        refreshCookieOptions.secure = true;
    }

    res
        .status(statusCode)
        .cookie('accessToken', accessToken, accessCookieOptions)
        .cookie('refreshToken', refreshToken, refreshCookieOptions)
        .json({
            success: true,
            message,
            data: { accessToken, refreshToken, user: { id: user._id, name: user.name, email: user.email, role: user.role, subscriptionPlan: user.subscriptionPlan } },
            error: null
        });
};

exports.register = async (req, res) => {
    try {
        const { name, password, role = 'patient', subscriptionPlan, patientProfile } = req.body;
        const email = normalizeEmail(req.body.email);
        const validationErrors = validateRegistration({ name, email, password, role, subscriptionPlan, patientProfile });

        if (validationErrors.length) {
            return sendResponse(res, 400, false, 'Please fix the highlighted fields', { errors: validationErrors });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return sendResponse(res, 400, false, 'Email already in use');
        }

        const user = await User.create({
            name: String(name).trim(),
            email,
            password,
            role,
            subscriptionPlan: subscriptionPlan || 'free'
        });

        if (role === 'patient' && patientProfile?.age !== undefined && patientProfile?.gender && patientProfile?.contact) {
            await Patient.create({
                name: String(name).trim(),
                age: Number(patientProfile.age),
                gender: patientProfile.gender,
                contact: String(patientProfile.contact).trim(),
                bloodGroup: patientProfile.bloodGroup ? String(patientProfile.bloodGroup).trim() : undefined,
                userAccount: user._id,
                createdBy: user._id
            });
        }

        sendTokenResponse(user, 201, res, 'User registered successfully');
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.email) {
            return sendResponse(res, 400, false, 'Email already in use');
        }
        if (error.name === 'ValidationError') {
            return sendResponse(
                res,
                400,
                false,
                'Please fix the highlighted fields',
                { errors: Object.values(error.errors).map((err) => err.message) }
            );
        }
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.login = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const { password } = req.body;

        if (!email || !password) {
            return sendResponse(res, 400, false, 'Please provide an email and password');
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return sendResponse(res, 401, false, 'Invalid credentials');
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > Date.now()) {
            return sendResponse(res, 403, false, 'Account locked due to too many failed login attempts. Try again later.');
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            user.loginAttempts += 1;
            if (user.loginAttempts >= 5) {
                user.lockedUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 mins
            }
            await user.save({ validateModifiedOnly: true });
            return sendResponse(res, 401, false, 'Invalid credentials');
        }

        // Reset login attempts on successful login
        await User.updateOne(
            { _id: user._id },
            { $set: { loginAttempts: 0 }, $unset: { lockedUntil: 1 } }
        );

        sendTokenResponse(user, 200, res, 'Login successful');
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return sendResponse(res, 401, false, 'No refresh token provided');
        }

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return sendResponse(res, 401, false, 'Invalid refresh token');
        }

        sendTokenResponse(user, 200, res, 'Token refreshed successfully');
    } catch (error) {
        sendResponse(res, 401, false, 'Invalid or expired refresh token', null, error.message);
    }
};

exports.logout = async (req, res) => {
    res.cookie('accessToken', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.cookie('refreshToken', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    sendResponse(res, 200, true, 'Logged out successfully');
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        sendResponse(res, 200, true, 'User fetched successfully', user);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return sendResponse(res, 404, false, 'There is no user with that email');
        }

        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password reset token',
                message
            });

            sendResponse(res, 200, true, 'Email sent');
        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });

            return sendResponse(res, 500, false, 'Email could not be sent');
        }
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return sendResponse(res, 400, false, 'Invalid token');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        // Also unlock account if it was locked
        user.loginAttempts = 0;
        user.lockedUntil = undefined;
        
        await user.save();

        sendTokenResponse(user, 200, res, 'Password reset successful');
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};
