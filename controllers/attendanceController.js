const Attendance = require('../models/Attendance');
const User = require('../models/User');
const sendResponse = require('../utils/response');
const logAudit = require('../utils/auditLogger');

const startOfDay = (value) => {
    const date = value ? new Date(value) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

exports.getAttendance = async (req, res) => {
    try {
        const query = {};

        if (req.query.role) query.role = req.query.role;
        if (req.query.userId) query.userId = req.query.userId;
        if (req.query.date) query.date = startOfDay(req.query.date);

        const records = await Attendance.find(query)
            .populate('userId', 'name email role specialty shift salary')
            .populate('markedBy', 'name email role')
            .sort({ date: -1, createdAt: -1 })
            .limit(250);

        sendResponse(res, 200, true, 'Attendance retrieved', records);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve attendance', null, error.message);
    }
};

exports.upsertAttendance = async (req, res) => {
    try {
        const { userId, status = 'present', checkIn, checkOut, notes } = req.body;
        const date = startOfDay(req.body.date);

        const user = await User.findById(userId);
        if (!user || !['doctor', 'receptionist'].includes(user.role)) {
            return sendResponse(res, 400, false, 'Attendance can only be marked for doctors or receptionists');
        }

        const record = await Attendance.findOneAndUpdate(
            { userId, date },
            {
                userId,
                role: user.role,
                date,
                status,
                checkIn,
                checkOut,
                notes,
                markedBy: req.user.id
            },
            { upsert: true, returnDocument: 'after', runValidators: true }
        )
            .populate('userId', 'name email role specialty shift salary')
            .populate('markedBy', 'name email role');

        await logAudit(req.user.id, 'UPSERT_ATTENDANCE', 'Attendance', record._id, { userId, status, date }, req.ip);

        sendResponse(res, 200, true, 'Attendance saved', record);
    } catch (error) {
        sendResponse(res, 400, false, 'Failed to save attendance', null, error.message);
    }
};
