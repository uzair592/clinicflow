const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    contact: { type: String, required: true },
    bloodGroup: { type: String },
    createdBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
    assignedDoctor: { type: mongoose.Schema.ObjectId, ref: 'User' },
    userAccount: { type: mongoose.Schema.ObjectId, ref: 'User' }, // Link to patient user account for login access
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
}, { timestamps: true });

PatientSchema.index({ assignedDoctor: 1 });
PatientSchema.index({ userAccount: 1 });

module.exports = mongoose.model('Patient', PatientSchema);
