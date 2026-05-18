const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendResponse = require('../utils/response');

// Protect routes
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
        // Set token from cookie
        token = req.cookies.accessToken;
    }

    // Make sure token exists
    if (!token) {
        return sendResponse(res, 401, false, 'Not authorized to access this route');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        req.user = await User.findById(decoded.id);
        
        if (!req.user) {
            return sendResponse(res, 401, false, 'User not found');
        }

        if (!req.user.isActive) {
            return sendResponse(res, 403, false, 'User account is deactivated');
        }

        next();
    } catch (err) {
        return sendResponse(res, 401, false, 'Not authorized to access this route');
    }
};

module.exports = { protect };
