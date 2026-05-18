const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const sendResponse = require('../utils/response');
const logAudit = require('../utils/auditLogger');
const PDFDocument = require('pdfkit');

const getPatientIdForUser = async (userId) => {
    const patient = await Patient.findOne({ userAccount: userId, isDeleted: false });
    return patient ? patient._id : null;
};

exports.createPrescription = async (req, res) => {
    try {
        if (req.user.role === 'doctor') {
            req.body.doctorId = req.user.id;
        }
        const prescription = await Prescription.create(req.body);
        
        await logAudit(req.user.id, 'CREATE', 'Prescription', prescription._id, {}, req.ip);

        sendResponse(res, 201, true, 'Prescription created', prescription);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to create prescription', null, error.message);
    }
};

exports.getPrescriptions = async (req, res) => {
    try {
        let query = { isDeleted: false };
        
        if (req.user.role === 'doctor') {
            query.doctorId = req.user.id;
        } else if (req.user.role === 'patient') {
            const patientId = await getPatientIdForUser(req.user.id);
            if (!patientId) return sendResponse(res, 404, false, 'Patient profile not found');
            query.patientId = patientId;
        }

        const prescriptions = await Prescription.find(query)
            .populate('patientId')
            .populate('doctorId', 'name email')
            .sort({ createdAt: -1 });
        sendResponse(res, 200, true, 'Prescriptions retrieved', prescriptions);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.getPrescription = async (req, res) => {
    try {
        const prescription = await Prescription.findOne({ _id: req.params.id, isDeleted: false });
        if (!prescription) return sendResponse(res, 404, false, 'Prescription not found');

        if (req.user.role === 'doctor' && prescription.doctorId.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized');
        } else if (req.user.role === 'patient') {
            const patientId = await getPatientIdForUser(req.user.id);
            if (!patientId || prescription.patientId.toString() !== patientId.toString()) {
                return sendResponse(res, 403, false, 'Not authorized');
            }
        }

        sendResponse(res, 200, true, 'Prescription retrieved', prescription);
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.updatePrescription = async (req, res) => {
    try {
        let prescription = await Prescription.findOne({ _id: req.params.id, isDeleted: false });
        if (!prescription) return sendResponse(res, 404, false, 'Prescription not found');

        if (req.user.role === 'doctor' && prescription.doctorId.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized');
        }

        prescription = await Prescription.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        
        await logAudit(req.user.id, 'UPDATE', 'Prescription', prescription._id, { updatedFields: Object.keys(req.body) }, req.ip);

        sendResponse(res, 200, true, 'Prescription updated', prescription);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to update prescription', null, error.message);
    }
};

exports.deletePrescription = async (req, res) => {
    try {
        let prescription = await Prescription.findOne({ _id: req.params.id, isDeleted: false });
        if (!prescription) return sendResponse(res, 404, false, 'Prescription not found');

        // Soft delete
        prescription.isDeleted = true;
        prescription.deletedAt = new Date();
        await prescription.save();

        await logAudit(req.user.id, 'DELETE', 'Prescription', prescription._id, { method: 'soft_delete' }, req.ip);

        sendResponse(res, 200, true, 'Prescription deleted', {});
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};

exports.downloadPrescriptionPdf = async (req, res) => {
    try {
        const prescription = await Prescription.findOne({ _id: req.params.id, isDeleted: false }).populate('patientId').populate('doctorId');
        if (!prescription) return sendResponse(res, 404, false, 'Prescription not found');

        // Authorization: Only the patient or issuing doctor can download
        if (req.user.role === 'doctor' && prescription.doctorId._id.toString() !== req.user.id) {
            return sendResponse(res, 403, false, 'Not authorized to download this prescription');
        } else if (req.user.role === 'patient') {
            const patientId = await getPatientIdForUser(req.user.id);
            if (!patientId || prescription.patientId._id.toString() !== patientId.toString()) {
                return sendResponse(res, 403, false, 'Not authorized to download this prescription');
            }
        }

        await logAudit(req.user.id, 'DOWNLOAD_PDF', 'Prescription', prescription._id, {}, req.ip);

        // Generate PDF
        const doc = new PDFDocument();
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            res.writeHead(200, {
                'Content-Length': Buffer.byteLength(pdfData),
                'Content-Type': 'application/pdf',
                'Content-disposition': `attachment;filename=prescription_${prescription._id}.pdf`,
            });
            res.end(pdfData);
        });

        // Add content to PDF
        doc.fontSize(25).text('Clinic Automation System', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text('Prescription Details');
        doc.moveDown();
        
        doc.fontSize(12).text(`Date: ${prescription.createdAt.toDateString()}`);
        doc.text(`Doctor: ${prescription.doctorId.name}`);
        doc.text(`Patient Name: ${prescription.patientId.name}`);
        doc.moveDown();

        doc.fontSize(14).text('Medicines:');
        doc.moveDown(0.5);
        prescription.medicines.forEach((med, index) => {
            doc.fontSize(12).text(`${index + 1}. ${med.name} - ${med.dosage} (${med.frequency}) for ${med.duration}`);
        });

        if (prescription.instructions) {
            doc.moveDown();
            doc.fontSize(14).text('Instructions:');
            doc.fontSize(12).text(prescription.instructions);
        }

        doc.moveDown(4);
        doc.text('_______________________', { align: 'right' });
        doc.text('Doctor Signature       ', { align: 'right' });

        doc.end();
    } catch (error) {
        sendResponse(res, 500, false, 'Server Error', null, error.message);
    }
};
