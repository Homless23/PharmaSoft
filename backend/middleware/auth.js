const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes - verifies JWT from Authorization header or cookie
exports.protect = async (req, res, next) => {
  let token;

  // 1) Try Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  // 2) Fall back to cookie (useful for browser-based auth where token is set as cookie)
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized' });
  }

  try {
    // Verify token and attach user to request object for downstream handlers
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token failed' });
  }
};