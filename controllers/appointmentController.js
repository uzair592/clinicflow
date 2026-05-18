const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const sendResponse = require('../utils/response');
const logAudit = require('../utils/auditLogger');

const getPatientIdForUser = async (userId) => {
    const patient = await Patient.findOne({ userAccount: userId, isDeleted: false });
    return patient ? patient._id : null;
};

exports.createAppointment = async (req, res) => {
    try {
        const { doctorId, date, timeSlot } = req.body;

        if (req.user.role === 'patient') {
            const patientId = await getPatientIdForUser(req.user.id);
            if (!patientId) return sendResponse(res, 404, false, 'Patient profile not found for user');
            req.body.patientId = patientId;
        }

        // Appointment conflict prevention
        const existingAppointment = await Appointment.findOne({
            doctorId,
            date,
            timeSlot,
            status: { $nin: ['cancelled'] }
        });

        if (existingAppointment) {
            return sendResponse(res, 400, false, 'Doctor is already booked for this date and time slot');
        }

        const appointment = await Appointment.create(req.body);

        await logAudit(req.user.id, 'CREATE', 'Appointment', appointment._id, { date, timeSlot }, req.ip);

        sendResponse(res, 201, true, 'Appointment created', appointment);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to create appointment', null, error.message);
    }
};

exports.getAppointments = async (req, res) => {
    try {
        let query = {};
        
        if (req.user.role === 'doctor') {
            query.doctorId = req.user.id;
        } else if (req.user.role === 'patient') {
            const patientId = await getPatientIdForUser(req.user.id);
            if (!patientId) return sendResponse(res, 404, false, 'Patient profile not found for user');
            query.patientId = patientId;
        }

        const appointments = await Appointment.find(query)
            .populate('patientId')
            .populate('doctorId', 'name email')
            .sort({ date: 1, timeSlot: 1 });
        sendResponse(res, 200, true, 'Appointments retrieved', appointments);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.getAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return sendResponse(res, 404, false, 'Appointment not found');

        if (req.user.role === 'doctor' && appointment.doctorId.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized');
        } else if (req.user.role === 'patient') {
            const patientId = await getPatientIdForUser(req.user.id);
            if (!patientId || appointment.patientId.toString() !== patientId.toString()) {
                return sendResponse(res, 403, false, 'Not authorized');
            }
        }

        sendResponse(res, 200, true, 'Appointment retrieved', appointment);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.updateAppointment = async (req, res) => {
    try {
        let appointment = await Appointment.findById(req.params.id);
        if (!appointment) return sendResponse(res, 404, false, 'Appointment not found');

        if (req.user.role === 'doctor' && appointment.doctorId.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized');
        }

        // Status machine enforcement
        if (req.body.status) {
            const newStatus = req.body.status;
            
            if (newStatus === 'confirmed' || newStatus === 'cancelled') {
                if (req.user.role !== 'admin' && req.user.role !== 'receptionist') {
                    return sendResponse(res, 403, false, `Only receptionists or admins can mark as ${newStatus}`);
                }
            } else if (newStatus === 'completed') {
                if (req.user.role !== 'doctor') {
                    return sendResponse(res, 403, false, 'Only doctors can mark appointment as completed');
                }
            }
        }

        appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
            .populate('patientId')
            .populate('doctorId', 'name email');
        
        await logAudit(req.user.id, 'UPDATE', 'Appointment', appointment._id, { updatedFields: Object.keys(req.body) }, req.ip);

        sendResponse(res, 200, true, 'Appointment updated', appointment);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to update appointment', null, error.message);
    }
};

exports.deleteAppointment = async (req, res) => {
    try {
        let appointment = await Appointment.findById(req.params.id);
        if (!appointment) return sendResponse(res, 404, false, 'Appointment not found');

        await appointment.deleteOne();
        
        await logAudit(req.user.id, 'DELETE', 'Appointment', appointment._id, {}, req.ip);

        sendResponse(res, 200, true, 'Appointment deleted', {});
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};
