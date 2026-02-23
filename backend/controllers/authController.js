const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const LoginEvent = require('../models/LoginEvent');
const { writeAuditLog } = require('../utils/auditLog');
const { sendError } = require('../utils/apiResponse');

const MAX_AVATAR_DATA_URL_LENGTH = 1800000;
const AVATAR_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif);base64,[a-zA-Z0-9+/=]+$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const TOKEN_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_token';
const resolveTokenTtlMinutes = () => {
    const raw = Number(process.env.ACCESS_TOKEN_TTL_MINUTES || 15);
    if (!Number.isFinite(raw)) return 15;
    return Math.min(Math.max(Math.floor(raw), 15), 30);
};
const TOKEN_TTL_MINUTES = resolveTokenTtlMinutes();
const TOKEN_MAX_AGE_MS = TOKEN_TTL_MINUTES * 60 * 1000;

const sanitizeAvatarDataUrl = (value) => {
    const next = String(value || '').trim();
    if (!next) return '';
    if (next.length > MAX_AVATAR_DATA_URL_LENGTH) {
        return null;
    }
    if (!AVATAR_DATA_URL_PATTERN.test(next)) {
        return null;
    }
    return next;
};

// Generate JWT
const generateToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign({
        id: String(user?._id || user?.id || ''),
        tokenVersion: Number(user?.tokenVersion || 0)
    }, process.env.JWT_SECRET, {
        expiresIn: `${TOKEN_TTL_MINUTES}m`,
    });
}

const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: TOKEN_MAX_AGE_MS,
        path: '/'
    };
};

const setAuthCookie = (res, token) => {
    res.cookie(TOKEN_COOKIE_NAME, token, getCookieOptions());
};

const clearAuthCookie = (res) => {
    res.clearCookie(TOKEN_COOKIE_NAME, { ...getCookieOptions(), maxAge: 0 });
};

const recordLoginEvent = async ({ user, email, success, req }) => {
    try {
        await LoginEvent.create({
            user: user?._id || null,
            email: String(email || '').trim().toLowerCase(),
            success: Boolean(success),
            role: user?.role || 'unknown',
            ip: req?.ip || req?.headers['x-forwarded-for'] || '',
            userAgent: req?.get?.('user-agent') || ''
        });
    } catch (error) {
        console.log('Failed to record login event:', error.message);
    }
};

// @desc    Register new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const cleanedName = String(name || '').trim();
    const cleanedPassword = String(password || '');
    const cleanedConfirmPassword = String(confirmPassword || '');
    const hasStrongPassword = STRONG_PASSWORD_PATTERN.test(cleanedPassword);

    try {
        if (!cleanedName || !normalizedEmail || !cleanedPassword || !cleanedConfirmPassword) {
            return sendError(res, 400, 'Please add all fields', 'AUTH_REGISTER_FIELDS_REQUIRED');
        }
        if (cleanedName.length < 2 || cleanedName.length > 60) {
            return sendError(res, 400, 'Name must be between 2 and 60 characters', 'AUTH_REGISTER_NAME_INVALID');
        }
        if (!hasStrongPassword) {
            return sendError(
                res,
                400,
                'Password must be at least 8 chars and include uppercase, lowercase, number, and symbol',
                'AUTH_REGISTER_PASSWORD_WEAK'
            );
        }
        if (cleanedPassword !== cleanedConfirmPassword) {
            return sendError(res, 400, 'Password and confirm password do not match', 'AUTH_REGISTER_PASSWORD_MISMATCH');
        }

        // Check if user exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return sendError(res, 400, 'User already exists', 'AUTH_REGISTER_USER_EXISTS');
        }

        // Create user (password hashing is handled in Model)
        const user = await User.create({
            name: cleanedName,
            email: normalizedEmail,
            password: cleanedPassword
        });

        if (user) {
            const token = generateToken(user);
            setAuthCookie(res, token);
            await writeAuditLog({
                req,
                userId: user._id,
                action: 'AUTH_REGISTER',
                entityType: 'user',
                entityId: user._id,
                status: 'success',
                details: { email: user.email, role: user.role }
            });
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                avatarDataUrl: user.avatarDataUrl || '',
                role: user.role
            });
        } else {
            return sendError(res, 400, 'Invalid user data', 'AUTH_REGISTER_INVALID_DATA');
        }
    } catch (error) {
        // Handle unique index race condition / duplicate insertion attempts cleanly.
        if (error?.code === 11000) {
            return sendError(res, 400, 'User already exists', 'AUTH_REGISTER_USER_EXISTS');
        }

        console.log(error);
        return sendError(res, 500, 'Server Error', 'AUTH_REGISTER_ERROR');
    }
}

// @desc    Authenticate a user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    try {
        // Check for user email
        const user = await User.findOne({ email: normalizedEmail });

        const isMatch = user ? await bcrypt.compare(String(password || ''), user.password) : false;
        if (user && isMatch) {
            user.lastLoginAt = new Date();
            await user.save();
            await recordLoginEvent({ user, email: normalizedEmail, success: true, req });
            const token = generateToken(user);
            setAuthCookie(res, token);
            await writeAuditLog({
                req,
                userId: user._id,
                action: 'AUTH_LOGIN',
                entityType: 'user',
                entityId: user._id,
                status: 'success',
                details: { email: user.email, role: user.role }
            });
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                avatarDataUrl: user.avatarDataUrl || '',
                role: user.role
            });
        } else {
            await recordLoginEvent({ user: null, email: normalizedEmail, success: false, req });
            await writeAuditLog({
                req,
                userId: null,
                action: 'AUTH_LOGIN',
                entityType: 'user',
                entityId: normalizedEmail,
                status: 'failure',
                details: { email: normalizedEmail }
            });
            return sendError(res, 401, 'Invalid Credentials', 'AUTH_LOGIN_INVALID_CREDENTIALS');
        }
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'AUTH_LOGIN_ERROR');
    }
}

// @desc    Authenticate an admin user
// @route   POST /api/auth/admin/login
const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    try {
        const user = await User.findOne({ email: normalizedEmail });
        const isMatch = user ? await bcrypt.compare(String(password || ''), user.password) : false;
        if (!user || !isMatch || user.role !== 'admin') {
            await recordLoginEvent({ user: null, email: normalizedEmail, success: false, req });
            await writeAuditLog({
                req,
                userId: user?._id || null,
                action: 'AUTH_ADMIN_LOGIN',
                entityType: 'user',
                entityId: user?._id || normalizedEmail,
                status: 'failure',
                details: { email: normalizedEmail }
            });
            return sendError(res, 401, 'Invalid admin credentials', 'AUTH_ADMIN_INVALID_CREDENTIALS');
        }

        if (!user.ownerAdmin || String(user.ownerAdmin) !== String(user._id)) {
            user.ownerAdmin = user._id;
        }
        user.lastLoginAt = new Date();
        await user.save();
        await recordLoginEvent({ user, email: normalizedEmail, success: true, req });
        const token = generateToken(user);
        setAuthCookie(res, token);
        await writeAuditLog({
            req,
            userId: user._id,
            action: 'AUTH_ADMIN_LOGIN',
            entityType: 'user',
            entityId: user._id,
            status: 'success',
            details: { email: user.email, role: user.role }
        });

        return res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            avatarDataUrl: user.avatarDataUrl || '',
            role: user.role
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'AUTH_ADMIN_LOGIN_ERROR');
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('_id name email role avatarDataUrl createdAt updatedAt');
        if (!user) {
            return sendError(res, 404, 'User not found', 'AUTH_USER_NOT_FOUND');
        }
        return res.json(user);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'AUTH_PROFILE_FETCH_ERROR');
    }
};

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    const { name, avatarDataUrl, removeAvatar } = req.body;
    const nextName = String(name || '').trim();
    const shouldRemoveAvatar = Boolean(removeAvatar);

    try {
        if (!nextName) {
            return sendError(res, 400, 'Name is required', 'AUTH_PROFILE_NAME_REQUIRED');
        }
        if (nextName.length < 2 || nextName.length > 60) {
            return sendError(res, 400, 'Name must be between 2 and 60 characters', 'AUTH_PROFILE_NAME_INVALID');
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return sendError(res, 404, 'User not found', 'AUTH_USER_NOT_FOUND');
        }

        if (shouldRemoveAvatar) {
            user.avatarDataUrl = '';
        } else if (typeof avatarDataUrl !== 'undefined') {
            const cleanedAvatar = sanitizeAvatarDataUrl(avatarDataUrl);
            if (cleanedAvatar === null) {
                return sendError(
                    res,
                    400,
                    'Invalid profile image. Use PNG, JPG, WEBP, or GIF under 1.5MB.',
                    'AUTH_PROFILE_AVATAR_INVALID'
                );
            }
            user.avatarDataUrl = cleanedAvatar;
        }

        user.name = nextName;
        await user.save();
        await writeAuditLog({
            req,
            userId: user._id,
            action: 'AUTH_PROFILE_UPDATE',
            entityType: 'user',
            entityId: user._id,
            status: 'success',
            details: {
                nameChanged: true,
                avatarUpdated: typeof avatarDataUrl !== 'undefined' || shouldRemoveAvatar
            }
        });

        return res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            avatarDataUrl: user.avatarDataUrl || ''
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'AUTH_PROFILE_UPDATE_ERROR');
    }
};

// @desc    Change current user password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const nextPassword = String(newPassword || '');

    try {
        if (!currentPassword || !newPassword) {
            return sendError(res, 400, 'Please provide current and new passwords', 'AUTH_PASSWORD_FIELDS_REQUIRED');
        }
        if (!STRONG_PASSWORD_PATTERN.test(nextPassword)) {
            return sendError(
                res,
                400,
                'New password must be at least 8 chars and include uppercase, lowercase, number, and symbol',
                'AUTH_PASSWORD_WEAK'
            );
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return sendError(res, 404, 'User not found', 'AUTH_USER_NOT_FOUND');
        }

        const isMatch = await user.matchPassword(String(currentPassword));
        if (!isMatch) {
            return sendError(res, 400, 'Current password is incorrect', 'AUTH_PASSWORD_CURRENT_INVALID');
        }
        if (String(currentPassword) === nextPassword) {
            return sendError(
                res,
                400,
                'New password must be different from current password',
                'AUTH_PASSWORD_REUSE_NOT_ALLOWED'
            );
        }

        user.password = nextPassword;
        user.tokenVersion = Number(user.tokenVersion || 0) + 1;
        await user.save();
        const token = generateToken(user);
        setAuthCookie(res, token);
        await writeAuditLog({
            req,
            userId: user._id,
            action: 'AUTH_PASSWORD_CHANGE',
            entityType: 'user',
            entityId: user._id,
            status: 'success'
        });

        return res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'AUTH_PASSWORD_CHANGE_ERROR');
    }
};

const logoutUser = async (req, res) => {
    await writeAuditLog({
        req,
        userId: req.user?.id || null,
        action: 'AUTH_LOGOUT',
        entityType: 'user',
        entityId: req.user?.id || '',
        status: 'success'
    });
    clearAuthCookie(res);
    return res.json({ message: 'Logged out successfully' });
};

module.exports = { registerUser, loginUser, adminLogin, logoutUser, getMe, updateProfile, changePassword };
