const mongoose = require('mongoose');

const DiagnosisLogSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    symptoms: [{ type: String }],
    aiResponse: { type: String },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'] },
    suggestedTests: [{ type: String }]
}, { timestamps: true });

DiagnosisLogSchema.index({ patientId: 1 });
DiagnosisLogSchema.index({ doctorId: 1 });

module.exports = mongoose.model('DiagnosisLog', DiagnosisLogSchema);
