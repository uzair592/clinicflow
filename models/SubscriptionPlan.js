const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        enum: ['free', 'pro'],
        required: true,
        unique: true
    },
    maxPatients: {
        type: Number,
        required: true,
        min: 0
    },
    aiEnabled: {
        type: Boolean,
        default: false
    },
    advancedAnalytics: {
        type: Boolean,
        default: false
    },
    price: {
        type: Number,
        required: true,
        min: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
