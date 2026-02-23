const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Goal = require('../models/Goal');
const { sendError } = require('../utils/apiResponse');
const getInventoryOwnerId = (req) => String(req.user?.ownerAdmin || req.user?.id || req.user?._id || '');
const tenantGoalUserScope = (req) => {
    const ownerId = getInventoryOwnerId(req);
    const actorId = String(req.user?.id || req.user?._id || '');
    if (ownerId === actorId) return [ownerId];
    return [ownerId, actorId];
};

const REVENUE_CATEGORY_NAMES = new Set([
    'retail sales',
    'online orders',
    'insurance claims',
    'clinic supplies',
    'wholesale'
]);
const normalizeCategoryKey = (value) => String(value || '').trim().toLowerCase();
const HISTORY_WEIGHT = 0.7;
const BASELINE_WEIGHT = 0.3;

const parsePositiveNumber = (value) => {
    if (value === '' || value === null || typeof value === 'undefined') return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
};

const monthsBetween = (fromDate, toDate) => {
    const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const to = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    const diff = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    return Math.max(diff, 0);
};

// POST /api/v1/budgets/auto-allocate
exports.autoAllocateBudgets = async (req, res) => {
    const { savingsTarget, income, apply } = req.body || {};
    const shouldApply = apply !== false;

    try {
        const userId = getInventoryOwnerId(req);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const windowStart = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

        const [monthIncomes, recentIncomes, recentTransactions, categories, goals] = await Promise.all([
            Transaction.find({ user: userId, type: 'income', date: { $gte: monthStart } }).select('amount'),
            Transaction.find({ user: userId, type: 'income', date: { $gte: windowStart } }).select('amount category'),
            Transaction.find({ user: userId, type: { $ne: 'income' }, date: { $gte: windowStart } }).select('amount category'),
            Category.find({ user: userId, active: { $ne: false } }),
            Goal.find({ user: { $in: tenantGoalUserScope(req) }, status: { $in: ['active', 'paused'] } }).select('targetAmount currentAmount deadline')
        ]);

        const monthIncomeTotal = monthIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const recentIncomeTotal = recentIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const providedIncome = parsePositiveNumber(income);
        const monthlyIncome = providedIncome !== null
            ? providedIncome
            : (monthIncomeTotal > 0 ? monthIncomeTotal : Number(((recentIncomeTotal / 90) * 30).toFixed(2)));

        let derivedSavingsTarget = 0;
        goals.forEach((goal) => {
            const remaining = Math.max(Number(goal.targetAmount || 0) - Number(goal.currentAmount || 0), 0);
            if (remaining <= 0) return;
            if (!goal.deadline) return;
            const monthsLeft = monthsBetween(now, new Date(goal.deadline)) + 1;
            derivedSavingsTarget += remaining / Math.max(monthsLeft, 1);
        });

        const providedSavings = parsePositiveNumber(savingsTarget);
        const finalSavingsTarget = providedSavings !== null ? providedSavings : derivedSavingsTarget;
        const spendableBudget = Math.max(monthlyIncome - finalSavingsTarget, 0);

        const transactionWeights = {};
        let totalWindowSpend = 0;
        recentTransactions.forEach((item) => {
            const category = normalizeCategoryKey(item.category);
            const amount = Number(item.amount || 0);
            if (!category || !Number.isFinite(amount) || amount <= 0) return;
            transactionWeights[category] = (transactionWeights[category] || 0) + amount;
            totalWindowSpend += amount;
        });

        const incomeCategoryNames = new Set(
            recentIncomes
                .map((item) => normalizeCategoryKey(item.category))
                .filter(Boolean)
        );

        const budgetCategories = categories.filter((category) => {
            const name = normalizeCategoryKey(category.name);
            if (!name) return false;
            if (REVENUE_CATEGORY_NAMES.has(name)) return false;
            if (incomeCategoryNames.has(name)) return false;
            return true;
        });

        const includedSpendTotal = budgetCategories.reduce((sum, category) => {
            const key = normalizeCategoryKey(category.name);
            return sum + Number(transactionWeights[key] || 0);
        }, 0);

        const defaultWeight = budgetCategories.length > 0 ? 1 / budgetCategories.length : 0;
        const suggestions = budgetCategories.map((category) => {
            const key = normalizeCategoryKey(category.name);
            const matchedWeight = Number(transactionWeights[key] || 0);
            const historicalWeight = includedSpendTotal > 0
                ? matchedWeight / includedSpendTotal
                : defaultWeight;
            const baseWeight = (historicalWeight * HISTORY_WEIGHT) + (defaultWeight * BASELINE_WEIGHT);
            const suggested = Math.round(spendableBudget * baseWeight);
            return {
                _id: category._id,
                name: category.name,
                currentBudget: Number(category.budget || 0),
                suggestedBudget: Math.max(suggested, 0),
                weightPercent: Number((baseWeight * 100).toFixed(2))
            };
        });

        if (shouldApply && suggestions.length > 0) {
            await Promise.all(
                suggestions.map((item) => Category.findByIdAndUpdate(item._id, { $set: { budget: item.suggestedBudget, date: new Date() } }))
            );
        }

        return res.json({
            monthlyIncome: Number(monthlyIncome.toFixed(2)),
            savingsTarget: Number(finalSavingsTarget.toFixed(2)),
            spendableBudget: Number(spendableBudget.toFixed(2)),
            usedDerivedSavings: providedSavings === null,
            usedIncomeFallback: providedIncome === null && monthIncomeTotal === 0,
            applied: shouldApply,
            suggestions
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'BUDGET_AUTO_ALLOCATE_ERROR');
    }
};

