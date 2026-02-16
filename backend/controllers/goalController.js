const Goal = require('../models/Goal');

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
        const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 });
        return res.json(goals.map(normalizeGoal));
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
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
            return res.status(400).json({ message: 'Valid title and target amount are required' });
        }
        if (!Number.isFinite(current) || current < 0) {
            return res.status(400).json({ message: 'Current amount must be 0 or higher' });
        }

        const goal = await Goal.create({
            user: req.user.id,
            title: cleanedTitle,
            targetAmount: target,
            currentAmount: current,
            deadline: parsedDeadline
        });

        return res.status(201).json(normalizeGoal(goal));
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateGoal = async (req, res) => {
    const { id } = req.params;
    const { title, targetAmount, currentAmount, deadline, status } = req.body;

    try {
        const goal = await Goal.findById(id);
        if (!goal) return res.status(404).json({ message: 'Goal not found' });
        if (goal.user.toString() !== req.user.id) return res.status(401).json({ message: 'User not authorized' });

        if (typeof title === 'string') {
            const cleanedTitle = title.trim();
            if (!cleanedTitle) return res.status(400).json({ message: 'Title cannot be empty' });
            goal.title = cleanedTitle;
        }
        if (typeof targetAmount !== 'undefined') {
            const target = Number(targetAmount);
            if (!Number.isFinite(target) || target <= 0) {
                return res.status(400).json({ message: 'Target amount must be greater than 0' });
            }
            goal.targetAmount = target;
        }
        if (typeof currentAmount !== 'undefined') {
            const current = Number(currentAmount);
            if (!Number.isFinite(current) || current < 0) {
                return res.status(400).json({ message: 'Current amount must be 0 or higher' });
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
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteGoal = async (req, res) => {
    const { id } = req.params;

    try {
        const goal = await Goal.findById(id);
        if (!goal) return res.status(404).json({ message: 'Goal not found' });
        if (goal.user.toString() !== req.user.id) return res.status(401).json({ message: 'User not authorized' });

        await Goal.findByIdAndDelete(id);
        return res.json({ message: 'Goal deleted' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};
