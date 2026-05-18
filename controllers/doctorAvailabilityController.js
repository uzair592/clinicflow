const DoctorAvailability = require('../models/DoctorAvailability');
const sendResponse = require('../utils/response');

exports.createAvailability = async (req, res) => {
    try {
        req.body.doctorId = req.user.role === 'doctor' ? req.user.id : req.body.doctorId;
        const availability = await DoctorAvailability.create(req.body);
        sendResponse(res, 201, true, 'Availability created', availability);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to create availability', null, error.message);
    }
};

exports.getAvailabilities = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'doctor') {
            query.doctorId = req.user.id;
        }
        
        const availabilities = await DoctorAvailability.find(query);
        sendResponse(res, 200, true, 'Availabilities retrieved', availabilities);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.getAvailability = async (req, res) => {
    try {
        const availability = await DoctorAvailability.findById(req.params.id);
        if (!availability) return sendResponse(res, 404, false, 'Availability not found');

        sendResponse(res, 200, true, 'Availability retrieved', availability);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.updateAvailability = async (req, res) => {
    try {
        let availability = await DoctorAvailability.findById(req.params.id);
        if (!availability) return sendResponse(res, 404, false, 'Availability not found');

        if (req.user.role === 'doctor' && availability.doctorId.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized');
        }

        availability = await DoctorAvailability.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        sendResponse(res, 200, true, 'Availability updated', availability);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to update availability', null, error.message);
    }
};

exports.deleteAvailability = async (req, res) => {
    try {
        let availability = await DoctorAvailability.findById(req.params.id);
        if (!availability) return sendResponse(res, 404, false, 'Availability not found');

        if (req.user.role === 'doctor' && availability.doctorId.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized');
        }

        await availability.deleteOne();
        sendResponse(res, 200, true, 'Availability deleted', {});
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};
