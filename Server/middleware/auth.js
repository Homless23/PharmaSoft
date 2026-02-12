const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const bearerToken = req.header('authorization')?.startsWith('Bearer ')
    ? req.header('authorization').split(' ')[1]
    : null;

  // Support both legacy x-auth-token and standard Bearer auth.
  const token = req.header('x-auth-token') || bearerToken;

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
    return res.status(401).json({ success: false, error: 'Token is not valid or has expired' });
  }
};
