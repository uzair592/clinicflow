const AuditLog = require('../models/AuditLog');
const AIRequestLog = require('../models/AIRequestLog');
const sendResponse = require('../utils/response');

exports.getAuditLogs = async (req, res) => {
    try {
        const logs = await AuditLog.find()
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 })
            .limit(100);

        sendResponse(res, 200, true, 'Audit logs retrieved', logs);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve audit logs', null, error.message);
    }
};

exports.getAIRequestLogs = async (req, res) => {
    try {
        const logs = await AIRequestLog.find()
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 })
            .limit(100);

        sendResponse(res, 200, true, 'AI request logs retrieved', logs);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve AI request logs', null, error.message);
    }
};
