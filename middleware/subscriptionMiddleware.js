const sendResponse = require('../utils/response');
const Patient = require('../models/Patient');
const SubscriptionPlan = require('../models/SubscriptionPlan');

const fallbackPlans = {
    free: { name: 'free', maxPatients: 20, aiEnabled: false, advancedAnalytics: false, price: 0 },
    basic: { name: 'free', maxPatients: 20, aiEnabled: false, advancedAnalytics: false, price: 0 },
    pro: { name: 'pro', maxPatients: 10000, aiEnabled: true, advancedAnalytics: true, price: 29 },
    premium: { name: 'pro', maxPatients: 10000, aiEnabled: true, advancedAnalytics: true, price: 29 }
};

const featureMap = {
    ai: 'aiEnabled',
    aiEnabled: 'aiEnabled',
    pro: 'aiEnabled',
    advancedAnalytics: 'advancedAnalytics',
    analytics: 'advancedAnalytics'
};

const getPlanForUser = async (user) => {
    const planName = user.subscriptionPlan || 'free';
    const normalizedPlan = planName === 'basic' ? 'free' : planName === 'premium' ? 'pro' : planName;
    const plan = await SubscriptionPlan.findOne({ name: normalizedPlan });

    return plan || fallbackPlans[planName] || fallbackPlans[normalizedPlan] || fallbackPlans.free;
};

const checkSubscription = (feature) => {
    return async (req, res, next) => {
        if (!req.user) {
            return sendResponse(res, 401, false, 'Not authorized');
        }

        try {
            const plan = await getPlanForUser(req.user);
            const capability = featureMap[feature] || feature;

            if (!plan[capability]) {
                return sendResponse(
                    res,
                    403,
                    false,
                    `Your ${plan.name} plan does not include this feature. Please upgrade to Pro.`
                );
            }

            req.subscriptionPlan = plan;
            next();
        } catch (error) {
            sendResponse(res, 500, false, 'Failed to verify subscription', null, error.message);
        }
    };
};

const enforcePatientLimit = async (req, res, next) => {
    if (!req.user) {
        return sendResponse(res, 401, false, 'Not authorized');
    }

    try {
        const plan = await getPlanForUser(req.user);
        const patientCount = await Patient.countDocuments({ isDeleted: false });

        if (patientCount >= plan.maxPatients) {
            return sendResponse(
                res,
                403,
                false,
                `Patient limit reached for the ${plan.name} plan. Please upgrade to Pro to add more patients.`,
                { maxPatients: plan.maxPatients, currentPatients: patientCount }
            );
        }

        req.subscriptionPlan = plan;
        next();
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to enforce patient limit', null, error.message);
    }
};

module.exports = { checkSubscription, enforcePatientLimit, getPlanForUser };
