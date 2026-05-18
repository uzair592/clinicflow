const DiagnosisLog = require('../models/DiagnosisLog');
const Patient = require('../models/Patient');
const sendResponse = require('../utils/response');
const { askAI } = require('../utils/aiService');

const getPatientIdForUser = async (userId) => {
    const patient = await Patient.findOne({ userAccount: userId });
    return patient ? patient._id : null;
};

exports.createDiagnosisLog = async (req, res) => {
    try {
        if (req.user.role === 'doctor') {
            req.body.doctorId = req.user.id;
        }
        let log = await DiagnosisLog.create(req.body);

        // Risk Flagging Hook (Async)
        (async () => {
            try {
                const lastLogs = await DiagnosisLog.find({ patientId: req.body.patientId })
                    .sort({ createdAt: -1 })
                    .limit(3);
                
                if (lastLogs.length === 3) {
                    const prompt = `Patient's last 3 diagnoses: ${lastLogs.map(l => l.symptoms.join(', ')).join(' | ')}`;
                    const context = `You are an AI analyzing medical history. Look at these last 3 visits. If there is a pattern indicating a worsening or chronic severe condition, reply strictly with JSON: {"flagged": true, "reason": "short explanation"}. Otherwise {"flagged": false}.`;
                    
                    const aiResult = await askAI(req.user.id, 'risk-flagging', prompt, context);
                    
                    if (aiResult && aiResult.flagged) {
                        log.riskLevel = 'high';
                        log.aiResponse = aiResult.reason;
                        await log.save();
                    }
                }
            } catch (err) {
                console.error("Risk Flagging Error:", err);
            }
        })();

        sendResponse(res, 201, true, 'Diagnosis log created', log);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to create diagnosis log', null, error.message);
    }
};

exports.getDiagnosisLogs = async (req, res) => {
    try {
        let query = {};
        
        if (req.user.role === 'doctor') {
            query.doctorId = req.user.id;
        } else if (req.user.role === 'patient') {
            const patientId = await getPatientIdForUser(req.user.id);
            if (!patientId) return sendResponse(res, 404, false, 'Patient profile not found');
            query.patientId = patientId;
        }

        const logs = await DiagnosisLog.find(query)
            .populate('patientId')
            .populate('doctorId', 'name email')
            .sort({ createdAt: -1 });
        sendResponse(res, 200, true, 'Diagnosis logs retrieved', logs);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.getDiagnosisLog = async (req, res) => {
    try {
        const log = await DiagnosisLog.findById(req.params.id);
        if (!log) return sendResponse(res, 404, false, 'Diagnosis log not found');

        if (req.user.role === 'doctor' && log.doctorId.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized');
        } else if (req.user.role === 'patient') {
            const patientId = await getPatientIdForUser(req.user.id);
            if (!patientId || log.patientId.toString() !== patientId.toString()) {
                return sendResponse(res, 403, false, 'Not authorized');
            }
        }

        sendResponse(res, 200, true, 'Diagnosis log retrieved', log);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.updateDiagnosisLog = async (req, res) => {
    try {
        let log = await DiagnosisLog.findById(req.params.id);
        if (!log) return sendResponse(res, 404, false, 'Diagnosis log not found');

        if (req.user.role === 'doctor' && log.doctorId.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized');
        }

        log = await DiagnosisLog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        sendResponse(res, 200, true, 'Diagnosis log updated', log);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to update diagnosis log', null, error.message);
    }
};

exports.deleteDiagnosisLog = async (req, res) => {
    try {
        let log = await DiagnosisLog.findById(req.params.id);
        if (!log) return sendResponse(res, 404, false, 'Diagnosis log not found');

        await log.deleteOne();
        sendResponse(res, 200, true, 'Diagnosis log deleted', {});
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};
