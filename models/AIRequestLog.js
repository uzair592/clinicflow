const mongoose = require('mongoose');

const AIRequestLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    feature: { type: String, required: true },
    prompt: { type: String, required: true },
    response: { type: String },
    latency: { type: Number },
    success: { type: Boolean, default: false },
    errorReason: { type: String },
    tokensUsed: { type: Number, default: 0 }
}, { timestamps: true });

AIRequestLogSchema.index({ userId: 1 });

module.exports = mongoose.model('AIRequestLog', AIRequestLogSchema);
