const Expense = require('../models/Expense');
const Category = require('../models/Category');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const sumExpenseAmount = (items) => items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

exports.getInsights = async (req, res) => {
    try {
        const now = new Date();
        const thisWeekStart = new Date(now.getTime() - WEEK_MS);
        const prevWeekStart = new Date(now.getTime() - (2 * WEEK_MS));

        const [allExpenseItems, categories] = await Promise.all([
            Expense.find({
                user: req.user.id,
                type: { $ne: 'income' },
                date: { $gte: prevWeekStart }
            }).select('amount category date'),
            Category.find({ user: req.user.id }).select('name budget')
        ]);

        const thisWeek = allExpenseItems.filter((item) => new Date(item.date) >= thisWeekStart);
        const prevWeek = allExpenseItems.filter((item) => {
            const date = new Date(item.date);
            return date >= prevWeekStart && date < thisWeekStart;
        });

        const thisWeekTotal = sumExpenseAmount(thisWeek);
        const prevWeekTotal = sumExpenseAmount(prevWeek);
        const weekDeltaPercent = prevWeekTotal > 0 ? ((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;

        const thisWeekByCategory = thisWeek.reduce((acc, item) => {
            const key = item.category || 'Other';
            acc[key] = (acc[key] || 0) + Number(item.amount || 0);
            return acc;
        }, {});
        const prevWeekByCategory = prevWeek.reduce((acc, item) => {
            const key = item.category || 'Other';
            acc[key] = (acc[key] || 0) + Number(item.amount || 0);
            return acc;
        }, {});

        const categoryShift = Object.keys(thisWeekByCategory)
            .map((category) => {
                const curr = thisWeekByCategory[category] || 0;
                const prev = prevWeekByCategory[category] || 0;
                const delta = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);
                return { category, curr, delta };
            })
            .sort((a, b) => b.delta - a.delta)[0] || null;

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthExpenses = await Expense.find({
            user: req.user.id,
            type: { $ne: 'income' },
            date: { $gte: monthStart }
        }).select('amount');

        const monthlySpent = sumExpenseAmount(monthExpenses);
        const monthlyBudget = categories.reduce((sum, c) => sum + Number(c.budget || 0), 0);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const projected = (monthlySpent / Math.max(now.getDate(), 1)) * daysInMonth;

        const insights = [];
        insights.push({
            code: 'WEEKLY_CHANGE',
            severity: weekDeltaPercent > 15 ? 'warning' : 'info',
            title: 'Weekly spend movement',
            detail: `This week is ${weekDeltaPercent >= 0 ? '+' : ''}${weekDeltaPercent.toFixed(1)}% vs last week.`
        });

        if (categoryShift) {
            insights.push({
                code: 'CATEGORY_SHIFT',
                severity: categoryShift.delta > 20 ? 'warning' : 'info',
                title: 'Category change',
                detail: `${categoryShift.category} moved ${categoryShift.delta >= 0 ? '+' : ''}${categoryShift.delta.toFixed(1)}% week over week.`
            });
        }

        if (monthlyBudget > 0) {
            insights.push({
                code: 'BUDGET_RUN_RATE',
                severity: projected > monthlyBudget ? 'danger' : 'success',
                title: 'Budget run rate',
                detail: `Projected month-end spend is Rs ${Math.round(projected).toLocaleString()} vs budget Rs ${Math.round(monthlyBudget).toLocaleString()}.`
            });
        }

        return res.json({
            metrics: {
                thisWeekTotal,
                prevWeekTotal,
                weekDeltaPercent: Number(weekDeltaPercent.toFixed(2)),
                monthlySpent,
                monthlyBudget,
                projectedMonthEnd: Number(projected.toFixed(2))
            },
            insights
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};
