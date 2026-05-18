const Patient = require('../models/Patient');
const sendResponse = require('../utils/response');
const logAudit = require('../utils/auditLogger');

exports.createPatient = async (req, res) => {
    try {
        req.body.createdBy = req.user.id;
        const patient = await Patient.create(req.body);
        
        await logAudit(req.user.id, 'CREATE', 'Patient', patient._id, { name: patient.name }, req.ip);

        sendResponse(res, 201, true, 'Patient created', patient);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to create patient', null, error.message);
    }
};

exports.getPatients = async (req, res) => {
    try {
        let query = { isDeleted: false };
        
        if (req.user.role === 'doctor') {
            query.assignedDoctor = req.user.id;
        } else if (req.user.role === 'patient') {
            query.userAccount = req.user.id;
        }

        const patients = await Patient.find(query);
        sendResponse(res, 200, true, 'Patients retrieved', patients);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.getPatient = async (req, res) => {
    try {
        const patient = await Patient.findOne({ _id: req.params.id, isDeleted: false });
        
        if (!patient) return sendResponse(res, 404, false, 'Patient not found');

        if (req.user.role === 'doctor' && patient.assignedDoctor?.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized to view this patient');
        }
        if (req.user.role === 'patient' && patient.userAccount?.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized to view this patient');
        }

        sendResponse(res, 200, true, 'Patient retrieved', patient);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.updatePatient = async (req, res) => {
    try {
        let patient = await Patient.findOne({ _id: req.params.id, isDeleted: false });
        
        if (!patient) return sendResponse(res, 404, false, 'Patient not found');

        if (req.user.role === 'doctor' && patient.assignedDoctor?.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized to update this patient');
        }

        patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        
        await logAudit(req.user.id, 'UPDATE', 'Patient', patient._id, { updatedFields: Object.keys(req.body) }, req.ip);

        sendResponse(res, 200, true, 'Patient updated', patient);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to update patient', null, error.message);
    }
};

exports.deletePatient = async (req, res) => {
    try {
        let patient = await Patient.findOne({ _id: req.params.id, isDeleted: false });
        
        if (!patient) return sendResponse(res, 404, false, 'Patient not found');

        // Soft delete
        patient.isDeleted = true;
        patient.deletedAt = new Date();
        await patient.save();

        await logAudit(req.user.id, 'DELETE', 'Patient', patient._id, { method: 'soft_delete' }, req.ip);

        sendResponse(res, 200, true, 'Patient deleted', {});
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};
