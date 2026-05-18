const User = require('../models/User');
const sendResponse = require('../utils/response');
const logAudit = require('../utils/auditLogger');

const allowedRoles = ['admin', 'doctor', 'receptionist', 'patient'];
const allowedPlans = ['free', 'pro'];
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const isValidEmail = (email) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(email);

exports.createUser = async (req, res) => {
    try {
        const {
            name,
            password,
            role = 'doctor',
            subscriptionPlan = 'free',
            phone,
            education,
            specialty,
            salary,
            shift,
            shiftStart,
            shiftEnd
        } = req.body;
        const email = normalizeEmail(req.body.email);

        if (!name || String(name).trim().length < 2) {
            return sendResponse(res, 400, false, 'Name must be at least 2 characters');
        }
        if (!email || !isValidEmail(email)) {
            return sendResponse(res, 400, false, 'Please provide a valid email address');
        }
        if (!password || String(password).length < 6) {
            return sendResponse(res, 400, false, 'Password must be at least 6 characters');
        }
        if (!allowedRoles.includes(role)) {
            return sendResponse(res, 400, false, 'Invalid role selected');
        }
        if (!allowedPlans.includes(subscriptionPlan)) {
            return sendResponse(res, 400, false, 'Invalid subscription plan selected');
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return sendResponse(res, 400, false, 'Email already in use');
        }

        const user = await User.create({
            name: String(name).trim(),
            email,
            password,
            role,
            subscriptionPlan,
            phone,
            education,
            specialty,
            salary: salary === '' || salary === undefined ? 0 : Number(salary),
            shift,
            shiftStart,
            shiftEnd
        });

        await logAudit(req.user.id, 'CREATE', 'User', user._id, { role, subscriptionPlan }, req.ip);

        const safeUser = user.toObject();
        delete safeUser.password;

        sendResponse(res, 201, true, 'User created', safeUser);
    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.email) {
            return sendResponse(res, 400, false, 'Email already in use');
        }
        sendResponse(res, 500, false, 'Failed to create user', null, error.message);
    }
};

exports.getUsers = async (req, res) => {
    try {
        const query = {};

        if (req.query.role) {
            query.role = req.query.role;
        }

        if (req.user.role !== 'admin' || req.query.includeInactive !== 'true') {
            query.isActive = true;
        }

        if (req.user.role !== 'admin') {
            query.role = 'doctor';
        }

        const users = await User.find(query)
            .select('-password -resetPasswordToken -resetPasswordExpire')
            .sort({ role: 1, name: 1 });

        sendResponse(res, 200, true, 'Users retrieved', users);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve users', null, error.message);
    }
};

exports.updateUser = async (req, res) => {
    try {
        const allowedFields = [
            'name',
            'role',
            'subscriptionPlan',
            'isActive',
            'phone',
            'education',
            'specialty',
            'salary',
            'shift',
            'shiftStart',
            'shiftEnd'
        ];
        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        if (updates.role && !allowedRoles.includes(updates.role)) {
            return sendResponse(res, 400, false, 'Invalid role selected');
        }
        if (updates.subscriptionPlan && !allowedPlans.includes(updates.subscriptionPlan)) {
            return sendResponse(res, 400, false, 'Invalid subscription plan selected');
        }
        if (updates.salary !== undefined) {
            updates.salary = updates.salary === '' ? 0 : Number(updates.salary);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, {
            returnDocument: 'after',
            runValidators: true
        }).select('-password -resetPasswordToken -resetPasswordExpire');

        if (!user) {
            return sendResponse(res, 404, false, 'User not found');
        }

        await logAudit(req.user.id, 'UPDATE', 'User', user._id, { updatedFields: Object.keys(updates) }, req.ip);

        sendResponse(res, 200, true, 'User updated', user);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to update user', null, error.message);
    }
};

exports.deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return sendResponse(res, 400, false, 'You cannot deactivate your own account');
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { returnDocument: 'after', runValidators: true }
        ).select('-password -resetPasswordToken -resetPasswordExpire');

        if (!user) {
            return sendResponse(res, 404, false, 'User not found');
        }

        await logAudit(req.user.id, 'DEACTIVATE', 'User', user._id, { role: user.role }, req.ip);

        sendResponse(res, 200, true, 'User deactivated', user);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to deactivate user', null, error.message);
    }
};
