const DiagnosisLog = require('../models/DiagnosisLog');
const Prescription = require('../models/Prescription');
const sendResponse = require('../utils/response');
const { askAI } = require('../utils/aiService');

exports.symptomCheck = async (req, res) => {
    try {
        const { symptoms, age, gender, historyIds } = req.body;

        let historyText = "No previous history provided.";
        if (historyIds && historyIds.length > 0) {
            const history = await DiagnosisLog.find({ _id: { $in: historyIds } });
            historyText = history.map(h => `Date: ${h.createdAt.toDateString()}, Symptoms: ${h.symptoms.join(', ')}`).join('; ');
        }

        const context = `You are an expert AI medical assistant analyzing a patient's symptoms. Respond strictly with a JSON object in this format: { "conditions": ["possible condition 1", "possible condition 2"], "riskLevel": "low" | "medium" | "high", "suggestedTests": ["test 1"] }`;
        
        const prompt = `Patient Details: Age ${age}, Gender ${gender}.\nCurrent Symptoms: ${symptoms.join(', ')}.\nMedical History: ${historyText}`;

        const aiResponse = await askAI(req.user.id, 'symptom-check', prompt, context);

        if (aiResponse && aiResponse.fallback) {
            return sendResponse(res, 200, true, 'AI Fallback Used', aiResponse);
        }

        sendResponse(res, 200, true, 'Symptom analysis complete', aiResponse);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.explainPrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id).populate('doctorId', 'name');
        if (!prescription) {
            return sendResponse(res, 404, false, 'Prescription not found');
        }

        const { urdu } = req.query;

        const context = `You are a helpful, empathetic medical assistant. Explain the following prescription to the patient in simple, non-medical terms. Describe what each medicine is likely for, and how to take it. Be reassuring.${urdu ? ' PLEASE PROVIDE THE ENTIRE RESPONSE IN URDU.' : ''}`;
        
        const prompt = `Doctor: ${prescription.doctorId.name}\nMedicines: ${JSON.stringify(prescription.medicines)}\nInstructions: ${prescription.instructions || 'None'}`;

        const aiResponse = await askAI(req.user.id, 'explain-prescription', prompt, context);

        if (aiResponse && aiResponse.fallback) {
            return sendResponse(res, 200, true, 'AI Fallback Used', aiResponse);
        }

        sendResponse(res, 200, true, 'Prescription explained', { explanation: aiResponse });
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};
