const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');
const Category = require('../models/Category');
const { cleanupCategoryDuplicatesForUser } = require('../utils/categoryCleanup');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

// GET /api/admin/users
const getUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('_id name email role createdAt lastLoginAt')
            .sort({ createdAt: -1 });
        return res.json(users);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// GET /api/admin/logins
const getLoginEvents = async (req, res) => {
    try {
        const events = await LoginEvent.find({})
            .sort({ createdAt: -1 })
            .limit(300);
        return res.json(events);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/admin/users
const createUserByAdmin = async (req, res) => {
    const { name, email, password, role } = req.body;
    const cleanedName = String(name || '').trim();
    const normalizedEmail = normalizeEmail(email);
    const cleanedPassword = String(password || '');
    const nextRole = role === 'admin' ? 'admin' : 'user';

    try {
        if (!cleanedName || !normalizedEmail || !cleanedPassword) {
            return res.status(400).json({ message: 'Name, email, and password are required' });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name: cleanedName,
            email: normalizedEmail,
            password: cleanedPassword,
            role: nextRole
        });

        return res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// DELETE /api/admin/users/:id
const deleteUserByAdmin = async (req, res) => {
    const { id } = req.params;

    try {
        if (String(req.user.id) === String(id)) {
            return res.status(400).json({ message: 'Admin cannot delete own account' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.findByIdAndDelete(id);
        return res.json({ message: 'User deleted' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// POST /api/admin/categories/cleanup-duplicates
const cleanupCategoryDuplicatesForAllUsers = async (req, res) => {
    try {
        const userIds = await Category.distinct('user', { user: { $ne: null } });
        if (!userIds.length) {
            return res.json({
                message: 'No category data found',
                usersProcessed: 0,
                removed: 0,
                updated: 0,
                groupsWithDuplicates: 0,
                results: []
            });
        }

        const results = [];
        for (const userId of userIds) {
            // Sequential processing keeps DB pressure low for shared hosting.
            // eslint-disable-next-line no-await-in-loop
            const summary = await cleanupCategoryDuplicatesForUser(userId);
            results.push(summary);
        }

        const totals = results.reduce((acc, item) => {
            acc.removed += Number(item.removed || 0);
            acc.updated += Number(item.updated || 0);
            acc.groupsWithDuplicates += Number(item.groupsWithDuplicates || 0);
            return acc;
        }, { removed: 0, updated: 0, groupsWithDuplicates: 0 });

        return res.json({
            message: 'Category duplicate cleanup completed for all users',
            usersProcessed: results.length,
            ...totals,
            results
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getUsers,
    getLoginEvents,
    createUserByAdmin,
    deleteUserByAdmin,
    cleanupCategoryDuplicatesForAllUsers
};
