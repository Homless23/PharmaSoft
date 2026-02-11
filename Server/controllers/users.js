const User = require('../models/User');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ success: false, error: 'User already exists' });

    user = new User({ name, email, password });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ success: false, error: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      await AuditLog.create({ 
        user: user._id, 
        action: 'LOGIN_FAILURE', 
        details: 'Failed login attempt: Incorrect password', 
        ipAddress: ip 
      });
      return res.status(400).json({ success: false, error: 'Invalid Credentials' });
    }

    // Success Audit
    await AuditLog.create({ 
      user: user._id, 
      action: 'LOGIN_SUCCESS', 
      details: 'User authenticated successfully', 
      ipAddress: ip 
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Login Error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Session validation failed' });
  }
};

// @desc    Update identity details
// @route   PUT /api/auth/updatedetails
exports.updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      profileImage: req.body.profileImage
    };

    const user = await User.findByIdAndUpdate(req.user, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

// @desc    Update password (Requires old password verification)
// @route   PUT /api/auth/updatepassword
exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user).select('+password');
    const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.newPassword, salt);
    await user.save();

    await AuditLog.create({ 
      user: user._id, 
      action: 'PASSWORD_CHANGED', 
      details: 'User successfully updated security credentials',
      ipAddress: req.socket.remoteAddress
    });

    res.status(200).json({ success: true, data: 'Password updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Password update failed' });
  }
};

// @desc    Get security logs
// @route   GET /api/auth/logs
exports.getLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.user }).sort({ createdAt: -1 }).limit(15);
    res.status(200).json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not fetch logs' });
  }
};

// @desc    Delete account and associated data
// @route   DELETE /api/auth/deleteaccount
exports.deleteAccount = async (req, res) => {
  try {
    // Delete transactions first to avoid orphan data
    await Transaction.deleteMany({ user: req.user });
    // Delete user profile
    await User.findByIdAndDelete(req.user);

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Account deletion failed' });
  }
};