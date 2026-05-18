const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['doctor', 'receptionist'], required: true },
    date: { type: Date, required: true },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'leave'],
        default: 'present'
    },
    checkIn: { type: String },
    checkOut: { type: String },
    notes: { type: String },
    markedBy: { type: mongoose.Schema.ObjectId, ref: 'User' }
}, { timestamps: true });

AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ role: 1, date: -1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
