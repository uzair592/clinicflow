const mongoose = require('mongoose');

const DoctorAvailabilitySchema = new mongoose.Schema({
    doctorId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    dayOfWeek: { 
        type: String, 
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], 
        required: true 
    },
    slots: [{
        start: { type: String, required: true },
        end: { type: String, required: true },
        isBooked: { type: Boolean, default: false }
    }]
}, { timestamps: true });

DoctorAvailabilitySchema.index({ doctorId: 1 });

module.exports = mongoose.model('DoctorAvailability', DoctorAvailabilitySchema);
