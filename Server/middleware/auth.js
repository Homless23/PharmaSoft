const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // Extract token from custom header
  const token = req.header('x-auth-token');

  // Strict check for token presence
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token, authorization denied' });
  }

  try {
    // Verify token against secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user ID to the request object for use in controllers
    req.user = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token is not valid or has expired' });
  }
};