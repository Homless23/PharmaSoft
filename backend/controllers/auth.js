const User = require('../models/User');

// Register a new user and send JWT cookie back to client
exports.register = async (req, res) => {
  console.log('[auth.register] Called');
  try {
    console.log('[auth.register] req.body:', req.body);
    const { name, email, password } = req.body;
    
    console.log('[auth.register] Extracted:', { name, email });
    
    // Validate required fields
    if (!name || !email || !password) {
      console.log('[auth.register] Missing fields');
      return res.status(400).json({ success: false, error: 'Please provide name, email, and password' });
    }
    
    console.log('[auth.register] Calling User.create()');
    const user = await User.create({ name, email, password });
    console.log('[auth.register] User created:', user._id);
    
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('[auth.register] Caught error:', err.message);
    console.error('[auth.register] Stack:', err.stack);
    res.status(400).json({ success: false, error: err.message });
  }
};

// Login user using email and password
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide email and password' });
    }

    // Retrieve user and include password field (normally hidden)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log(`[Login] User not found for email ${email}`);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Compare entered password with hashed password stored in DB
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log(`[Login] Password mismatch for email ${email}`);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // On success, set a secure httpOnly cookie and return token in response body
    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('[Login] Error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// Return current logged-in user (protected route)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Update user details (protected)
exports.updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = { name: req.body.name, email: req.body.email };
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Helper: create cookie options and send token
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
  };
  // Set cookie and send JSON response containing token
  res.status(statusCode).cookie('token', token, options).json({ success: true, token });
};