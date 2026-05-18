const SubscriptionPlan = require('../models/SubscriptionPlan');
const User = require('../models/User');
const sendResponse = require('../utils/response');
const logAudit = require('../utils/auditLogger');

const defaultPlans = [
    { name: 'free', maxPatients: 20, aiEnabled: false, advancedAnalytics: false, price: 0 },
    { name: 'pro', maxPatients: 10000, aiEnabled: true, advancedAnalytics: true, price: 29 }
];

exports.seedDefaultPlans = async (req, res) => {
    try {
        const plans = await Promise.all(defaultPlans.map((plan) => (
            SubscriptionPlan.findOneAndUpdate(
                { name: plan.name },
                plan,
                { upsert: true, new: true, runValidators: true }
            )
        )));

        sendResponse(res, 200, true, 'Subscription plans seeded', plans);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to seed subscription plans', null, error.message);
    }
};

exports.getPlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.find().sort({ price: 1 });
        sendResponse(res, 200, true, 'Subscription plans retrieved', plans);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve subscription plans', null, error.message);
    }
};

exports.updateUserPlan = async (req, res) => {
    try {
        const { planName } = req.body;
        const normalizedPlan = planName === 'basic' ? 'free' : planName;

        if (!['free', 'pro'].includes(normalizedPlan)) {
            return sendResponse(res, 400, false, 'Subscription plan must be free or pro');
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { subscriptionPlan: normalizedPlan },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return sendResponse(res, 404, false, 'User not found');
        }

        await logAudit(req.user.id, 'UPDATE_PLAN', 'User', user._id, { planName: normalizedPlan }, req.ip);

        sendResponse(res, 200, true, 'User subscription plan updated', user);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to update user subscription plan', null, error.message);
    }
};
