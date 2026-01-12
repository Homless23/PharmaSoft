const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

// --- THE MISSING LINE IS HERE ---
const fetchuser = require('../middleware/fetchuser'); 
// --------------------------------

const JWT_SECRET = 'Harryisagoodb$oy';

// ============================================
// ROUTE 1: Create a User (POST /api/auth/register)
// ============================================
router.post('/register', [
    body('name', 'Enter a valid name').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    let success = false;
    // If there are errors, return Bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, errors: errors.array() });
    }
    try {
        // Check whether the user with this email exists already
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            return res.status(400).json({ success, error: "Sorry a user with this email already exists" });
        }
        
        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const secPassword = await bcrypt.hash(req.body.password, salt);

        // Create User
        user = await User.create({
            name: req.body.name,
            password: secPassword,
            email: req.body.email,
        });

        // Create Token
        const data = {
            user: {
                id: user.id
            }
        };
        const authToken = jwt.sign(data, JWT_SECRET);
        success = true;
        res.json({ success, authToken });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ============================================
// ROUTE 2: Authenticate a User (POST /api/auth/login)
// ============================================
router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success, error: "Please try to login with correct credentials" });
        }

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) {
            return res.status(400).json({ success, error: "Please try to login with correct credentials" });
        }

        const data = {
            user: {
                id: user.id
            }
        };
        const authToken = jwt.sign(data, JWT_SECRET);
        success = true;
        res.json({ success, token: authToken }); // Note: I standardized this to 'token' to match frontend

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ============================================
// ROUTE 3: Get Loggedin User Details (POST /api/auth/getuser)
// ============================================
router.post('/getuser', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("-password");
        res.send(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ============================================
// ROUTE 4: Update User Details (PUT /api/auth/update)
// ============================================
router.put('/update', fetchuser, async (req, res) => {
    try {
        const { name, email, avatar, password } = req.body;
        const userId = req.user.id;

        // 1. Find user
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        // 2. Prepare update object
        const updateFields = {};
        if (name) updateFields.name = name;
        if (email) updateFields.email = email;
        if (avatar) updateFields.avatar = avatar;

        // 3. If updating password, hash it first
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(password, salt);
        }

        // 4. Update and return new user data
        user = await User.findByIdAndUpdate(
            userId, 
            { $set: updateFields }, 
            { new: true }
        ).select("-password");

        res.json(user);

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;