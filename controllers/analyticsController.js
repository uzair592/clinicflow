const Appointment = require('../models/Appointment');
const DiagnosisLog = require('../models/DiagnosisLog');
const AIRequestLog = require('../models/AIRequestLog');
const Prescription = require('../models/Prescription');
const sendResponse = require('../utils/response');

const monthsAgo = (count) => {
    const date = new Date();
    date.setMonth(date.getMonth() - count);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
};

exports.getAppointmentsPerMonth = async (req, res) => {
    try {
        const data = await Appointment.aggregate([
            { $match: { date: { $exists: true } } },
            {
                $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    count: 1
                }
            }
        ]);

        sendResponse(res, 200, true, 'Appointments per month retrieved', data);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve appointment analytics', null, error.message);
    }
};

exports.getTopDiagnoses = async (req, res) => {
    try {
        const data = await DiagnosisLog.aggregate([
            { $unwind: '$symptoms' },
            { $group: { _id: { $toLower: '$symptoms' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, diagnosis: '$_id', count: 1 } }
        ]);

        sendResponse(res, 200, true, 'Top diagnoses retrieved', data);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve diagnosis analytics', null, error.message);
    }
};

exports.getAICallsPerDay = async (req, res) => {
    try {
        const data = await AIRequestLog.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    successful: { $sum: { $cond: ['$success', 1, 0] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateFromParts: {
                            year: '$_id.year',
                            month: '$_id.month',
                            day: '$_id.day'
                        }
                    },
                    count: 1,
                    successful: 1
                }
            }
        ]);

        sendResponse(res, 200, true, 'AI calls per day retrieved', data);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve AI analytics', null, error.message);
    }
};

exports.getPrescriptionsPerDoctor = async (req, res) => {
    try {
        const data = await Prescription.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: '$doctorId', count: { $sum: 1 } } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'doctor'
                }
            },
            { $unwind: '$doctor' },
            {
                $project: {
                    _id: 0,
                    doctorId: '$_id',
                    doctorName: '$doctor.name',
                    count: 1
                }
            },
            { $sort: { count: -1 } }
        ]);

        sendResponse(res, 200, true, 'Prescriptions per doctor retrieved', data);
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve prescription analytics', null, error.message);
    }
};

exports.getPredictiveAppointments = async (req, res) => {
    try {
        const since = monthsAgo(3);
        const monthly = await Appointment.aggregate([
            { $match: { date: { $gte: since } } },
            {
                $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const counts = monthly.map((item) => item.count);
        const average = counts.length ? counts.reduce((sum, count) => sum + count, 0) / counts.length : 0;
        const trend = counts.length > 1 ? (counts[counts.length - 1] - counts[0]) / (counts.length - 1) : 0;
        const projectedNextMonth = Math.max(0, Math.round(average + trend));

        sendResponse(res, 200, true, 'Appointment load projection retrieved', {
            monthsAnalyzed: counts.length,
            monthly: monthly.map((item) => ({
                year: item._id.year,
                month: item._id.month,
                count: item.count
            })),
            averageMonthlyAppointments: Number(average.toFixed(2)),
            trendPerMonth: Number(trend.toFixed(2)),
            projectedNextMonth
        });
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve predictive analytics', null, error.message);
    }
};

exports.getAnalyticsSummary = async (req, res) => {
    try {
        const [appointmentsPerMonth, topDiagnoses, aiCallsPerDay, prescriptionsPerDoctor] = await Promise.all([
            Appointment.aggregate([
                { $match: { date: { $exists: true } } },
                { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } }, count: { $sum: 1 } } },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]),
            DiagnosisLog.aggregate([
                { $unwind: '$symptoms' },
                { $group: { _id: { $toLower: '$symptoms' }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),
            AIRequestLog.aggregate([
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            Prescription.aggregate([
                { $match: { isDeleted: false } },
                { $group: { _id: '$doctorId', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);

        sendResponse(res, 200, true, 'Analytics summary retrieved', {
            appointmentsPerMonth,
            topDiagnoses,
            aiCallsPerDay,
            prescriptionsPerDoctor
        });
    } catch (error) {
        sendResponse(res, 500, false, 'Failed to retrieve analytics summary', null, error.message);
    }
};
