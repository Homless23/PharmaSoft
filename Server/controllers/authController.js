const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register user
exports.register = asyncHandler(async (req, res, next) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
        success: true,
        token: generateToken(user._id),
        user: { id: user._id, name: user.name, email: user.email }
    });
});

// @desc    Login user
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Validation for empty fields
    if (!email || !password) {
        res.status(400);
        throw new Error('Please provide email and password');
    }

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
        res.json({
            success: true,
            token: generateToken(user._id),
            user: { id: user._id, name: user.name, email: user.email }
        });
    } else {
        res.status(401);
        throw new Error('Invalid credentials'); // Generic error for security
    }
});