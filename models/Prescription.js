const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    appointmentId: { type: mongoose.Schema.ObjectId, ref: 'Appointment' },
    medicines: [{
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        duration: { type: String, required: true }
    }],
    instructions: { type: String },
    aiExplanation: { type: String },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
}, { timestamps: true });

PrescriptionSchema.index({ patientId: 1 });
PrescriptionSchema.index({ doctorId: 1 });

module.exports = mongoose.model('Prescription', PrescriptionSchema);
