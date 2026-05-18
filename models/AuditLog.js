const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetModel: { type: String, required: true },
    targetId: { type: mongoose.Schema.ObjectId, required: true },
    metadata: { type: Object },
    ip: { type: String }
}, { timestamps: true });

AuditLogSchema.index({ targetModel: 1, targetId: 1 });
AuditLogSchema.index({ userId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
