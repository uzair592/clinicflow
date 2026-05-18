const AuditLog = require('../models/AuditLog');

const logAudit = async (userId, action, targetModel, targetId, metadata = {}, ip = '') => {
    try {
        await AuditLog.create({
            userId,
            action,
            targetModel,
            targetId,
            metadata,
            ip
        });
    } catch (error) {
        console.error('Failed to log audit event:', error.message);
    }
};

module.exports = logAudit;
