const Expense = require('../models/Expense');

const DAY_MS = 24 * 60 * 60 * 1000;

const buildRecurring = (input) => {
    const enabled = Boolean(input?.enabled);
    const frequency = ['daily', 'weekly', 'monthly', 'yearly'].includes(input?.frequency)
        ? input.frequency
        : 'monthly';
    return { enabled, frequency };
};

const parseDateOrNull = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

exports.addExpense = async (req, res) => {
    const { title, amount, category, description, date, recurring, type } = req.body;
    const amountNumber = Number(amount);
    const expenseDate = parseDateOrNull(date);
    const normalizedType = type === 'income' ? 'income' : 'expense';

    try {
        if (!title || !category || !description || !expenseDate) {
            return res.status(400).json({ message: 'All fields are required!' });
        }
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number!' });
        }

        const expense = Expense({
            title: String(title).trim(),
            amount: amountNumber,
            type: normalizedType,
            category: String(category).trim(),
            description: String(description).trim(),
            date: expenseDate,
            recurring: buildRecurring(recurring),
            user: req.user.id
        });

        await expense.save();
        return res.status(201).json(expense);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.getExpenses = async (req, res) => {
    try {
        const {
            page,
            limit,
            search,
            category,
            startDate,
            endDate,
            recurringOnly,
            type
        } = req.query;

        const shouldPaginate = Boolean(page || limit || search || category || startDate || endDate || recurringOnly || type);
        const query = { user: req.user.id };

        if (search) {
            query.title = { $regex: String(search), $options: 'i' };
        }
        if (category && category !== 'All') {
            query.category = category;
        }
        if (startDate || endDate) {
            query.date = {};
            const start = parseDateOrNull(startDate);
            const end = parseDateOrNull(endDate);
            if (start) query.date.$gte = start;
            if (end) query.date.$lte = end;
        }
        if (String(recurringOnly).toLowerCase() === 'true') {
            query['recurring.enabled'] = true;
        }
        if (type === 'income' || type === 'expense') {
            query.type = type;
        }

        if (!shouldPaginate) {
            const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });
            return res.status(200).json(expenses);
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const skip = (pageNumber - 1) * limitNumber;

        const [items, total] = await Promise.all([
            Expense.find(query)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limitNumber),
            Expense.countDocuments(query)
        ]);

        return res.status(200).json({
            items,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.max(Math.ceil(total / limitNumber), 1)
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateExpense = async (req, res) => {
    const { id } = req.params;
    const { title, amount, category, description, date, recurring, type } = req.body;
    const amountNumber = Number(amount);
    const expenseDate = parseDateOrNull(date);
    const normalizedType = type === 'income' ? 'income' : 'expense';

    try {
        const expense = await Expense.findById(id);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        if (expense.user.toString() !== req.user.id) return res.status(401).json({ message: 'User not authorized' });

        if (!title || !category || !description || !expenseDate) {
            return res.status(400).json({ message: 'All fields are required!' });
        }
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number!' });
        }

        expense.title = String(title).trim();
        expense.amount = amountNumber;
        expense.type = normalizedType;
        expense.category = String(category).trim();
        expense.description = String(description).trim();
        expense.date = expenseDate;
        expense.recurring = buildRecurring(recurring);
        await expense.save();

        return res.status(200).json(expense);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.generateRecurringExpense = async (req, res) => {
    const { id } = req.params;
    try {
        const template = await Expense.findById(id);
        if (!template) return res.status(404).json({ message: 'Expense not found' });
        if (template.user.toString() !== req.user.id) return res.status(401).json({ message: 'User not authorized' });
        if (!template.recurring?.enabled) return res.status(400).json({ message: 'Expense is not recurring' });

        const lastDate = parseDateOrNull(template.date) || new Date();
        const nextDate = new Date(lastDate);
        switch (template.recurring.frequency) {
            case 'daily':
                nextDate.setTime(lastDate.getTime() + DAY_MS);
                break;
            case 'weekly':
                nextDate.setTime(lastDate.getTime() + (7 * DAY_MS));
                break;
            case 'yearly':
                nextDate.setFullYear(lastDate.getFullYear() + 1);
                break;
            case 'monthly':
            default:
                nextDate.setMonth(lastDate.getMonth() + 1);
                break;
        }

        const newExpense = await Expense.create({
            user: template.user,
            title: template.title,
            amount: template.amount,
            type: template.type || 'expense',
            category: template.category,
            description: `${template.description} (Auto recurrence)`,
            date: nextDate,
            recurring: template.recurring
        });

        return res.status(201).json(newExpense);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteExpense = async (req, res) => {
    const { id } = req.params;
    try {
        const expense = await Expense.findById(id);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        if (expense.user.toString() !== req.user.id) return res.status(401).json({ message: 'User not authorized' });

        await Expense.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Expense Deleted' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server Error' });
    }
};
