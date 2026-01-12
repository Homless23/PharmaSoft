const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // 1. Check if the "Authorization" header exists and starts with "Bearer"
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // 2. Get the token from the header (remove "Bearer " string)
            token = req.headers.authorization.split(' ')[1];

            // 3. Verify the token using our secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

            // 4. Find the user associated with this token (but don't include password)
            req.user = await User.findById(decoded.id).select('-password');

            next(); // 5. Allow the user to proceed to the route
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };