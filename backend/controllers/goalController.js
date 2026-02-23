const Goal = require('../models/Goal');
const { sendError } = require('../utils/apiResponse');
const getInventoryOwnerId = (req) => String(req.user?.ownerAdmin || req.user?.id || req.user?._id || '');
const tenantGoalUserScope = (req) => {
    const ownerId = getInventoryOwnerId(req);
    const actorId = String(req.user?.id || req.user?._id || '');
    if (ownerId === actorId) return [ownerId];
    return [ownerId, actorId];
};

const parseDateOrNull = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeGoal = (goalDoc) => {
    const goal = goalDoc.toObject ? goalDoc.toObject() : goalDoc;
    const targetAmount = Number(goal.targetAmount || 0);
    const currentAmount = Number(goal.currentAmount || 0);
    const progressPercent = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
    return {
        ...goal,
        targetAmount,
        currentAmount,
        progressPercent: Number(progressPercent.toFixed(2))
    };
};

exports.getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ user: { $in: tenantGoalUserScope(req) } }).sort({ createdAt: -1 });
        return res.json(goals.map(normalizeGoal));
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'GOALS_FETCH_ERROR');
    }
};

exports.createGoal = async (req, res) => {
    const { title, targetAmount, currentAmount, deadline } = req.body;
    const cleanedTitle = String(title || '').trim();
    const target = Number(targetAmount);
    const current = Number(currentAmount || 0);
    const parsedDeadline = parseDateOrNull(deadline);

    try {
        if (!cleanedTitle || !Number.isFinite(target) || target <= 0) {
            return sendError(res, 400, 'Valid title and target amount are required', 'GOAL_CREATE_FIELDS_INVALID');
        }
        if (!Number.isFinite(current) || current < 0) {
            return sendError(res, 400, 'Current amount must be 0 or higher', 'GOAL_CREATE_CURRENT_INVALID');
        }

        const goal = await Goal.create({
            user: getInventoryOwnerId(req),
            title: cleanedTitle,
            targetAmount: target,
            currentAmount: current,
            deadline: parsedDeadline
        });

        return res.status(201).json(normalizeGoal(goal));
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'GOAL_CREATE_ERROR');
    }
};

exports.updateGoal = async (req, res) => {
    const { id } = req.params;
    const { title, targetAmount, currentAmount, deadline, status } = req.body;

    try {
        const goal = await Goal.findOne({ _id: id, user: { $in: tenantGoalUserScope(req) } });
        if (!goal) return sendError(res, 404, 'Goal not found', 'GOAL_NOT_FOUND');

        if (typeof title === 'string') {
            const cleanedTitle = title.trim();
            if (!cleanedTitle) return sendError(res, 400, 'Title cannot be empty', 'GOAL_TITLE_INVALID');
            goal.title = cleanedTitle;
        }
        if (typeof targetAmount !== 'undefined') {
            const target = Number(targetAmount);
            if (!Number.isFinite(target) || target <= 0) {
                return sendError(res, 400, 'Target amount must be greater than 0', 'GOAL_TARGET_INVALID');
            }
            goal.targetAmount = target;
        }
        if (typeof currentAmount !== 'undefined') {
            const current = Number(currentAmount);
            if (!Number.isFinite(current) || current < 0) {
                return sendError(res, 400, 'Current amount must be 0 or higher', 'GOAL_CURRENT_INVALID');
            }
            goal.currentAmount = current;
        }
        if (typeof status === 'string' && ['active', 'completed', 'paused'].includes(status)) {
            goal.status = status;
        }
        if (typeof deadline !== 'undefined') {
            goal.deadline = parseDateOrNull(deadline);
        }

        if (goal.currentAmount >= goal.targetAmount) {
            goal.status = 'completed';
        }

        await goal.save();
        return res.json(normalizeGoal(goal));
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'GOAL_UPDATE_ERROR');
    }
};

exports.deleteGoal = async (req, res) => {
    const { id } = req.params;

    try {
        const goal = await Goal.findOne({ _id: id, user: { $in: tenantGoalUserScope(req) } });
        if (!goal) return sendError(res, 404, 'Goal not found', 'GOAL_NOT_FOUND');

        await Goal.deleteOne({ _id: id, user: { $in: tenantGoalUserScope(req) } });
        return res.json({ message: 'Goal deleted' });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'GOAL_DELETE_ERROR');
    }
};
