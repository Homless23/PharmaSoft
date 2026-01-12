const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password } = req.body; // 1. Get data from the user

    // 2. Check if all fields are filled
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please include all fields' });
    }

    // 3. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // 4. Hash (Scramble) the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create the user in the database
    const user = await User.create({
        name,
        email,
        password: hashedPassword,
    });

    // 6. Send back the result (including the ID card/Token)
    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id), // We give them a token to stay logged in
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// Helper function to generate Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d',
    });


};
// @desc    Authenticate a user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ email });

    // 2. Check if password matches
    if (user && (await bcrypt.compare(password, user.password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};
module.exports = { registerUser, loginUser };