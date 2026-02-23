const Transaction = require('../models/Transaction');
const { sendError } = require('../utils/apiResponse');

const DAY_MS = 24 * 60 * 60 * 1000;

const buildRecurring = (input) => {
    const enabled = Boolean(input?.enabled);
    const frequency = ['daily', 'weekly', 'monthly', 'yearly'].includes(input?.frequency)
        ? input.frequency
        : 'monthly';
    const autoCreate = Boolean(input?.autoCreate);
    return { enabled, frequency, autoCreate };
};

const parseDateOrNull = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getNextRecurringDate = (baseDate, frequency) => {
    const nextDate = new Date(baseDate);
    switch (frequency) {
        case 'daily':
            nextDate.setTime(baseDate.getTime() + DAY_MS);
            break;
        case 'weekly':
            nextDate.setTime(baseDate.getTime() + (7 * DAY_MS));
            break;
        case 'yearly':
            nextDate.setFullYear(baseDate.getFullYear() + 1);
            break;
        case 'monthly':
        default:
            nextDate.setMonth(baseDate.getMonth() + 1);
            break;
    }
    return nextDate;
};

exports.addTransaction = async (req, res) => {
    const { title, amount, category, description, date, recurring, type } = req.body;
    const amountNumber = Number(amount);
    const transactionDate = parseDateOrNull(date);
    const normalizedType = type === 'income' ? 'income' : 'outflow';

    try {
        if (!title || !category || !transactionDate) {
            return sendError(res, 400, 'Title, category, and date are required!', 'TRANSACTION_FIELDS_REQUIRED');
        }
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            return sendError(res, 400, 'Amount must be a positive number!', 'TRANSACTION_AMOUNT_INVALID');
        }

        const transaction = Transaction({
            title: String(title).trim(),
            amount: amountNumber,
            type: normalizedType,
            category: String(category).trim(),
            description: String(description || '').trim(),
            date: transactionDate,
            recurring: buildRecurring(recurring),
            user: req.user.id
        });
        if (transaction.recurring.enabled && normalizedType === 'outflow') {
            transaction.recurring.nextDueDate = getNextRecurringDate(transactionDate, transaction.recurring.frequency);
        }

        await transaction.save();
        return res.status(201).json(transaction);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'TRANSACTION_CREATE_ERROR');
    }
};

exports.getTransactions = async (req, res) => {
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
        if (type === 'income' || type === 'outflow') {
            query.type = type;
        }

        if (!shouldPaginate) {
            const transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 });
            return res.status(200).json(transactions);
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const skip = (pageNumber - 1) * limitNumber;

        const [items, total] = await Promise.all([
            Transaction.find(query)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limitNumber),
            Transaction.countDocuments(query)
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
        return sendError(res, 500, 'Server Error', 'TRANSACTION_LIST_ERROR');
    }
};

exports.updateTransaction = async (req, res) => {
    const { id } = req.params;
    const { title, amount, category, description, date, recurring, type } = req.body;
    const amountNumber = Number(amount);
    const transactionDate = parseDateOrNull(date);
    const normalizedType = type === 'income' ? 'income' : 'outflow';

    try {
        const transaction = await Transaction.findById(id);
        if (!transaction) return sendError(res, 404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
        if (transaction.user.toString() !== req.user.id) return sendError(res, 401, 'User not authorized', 'TRANSACTION_UNAUTHORIZED');

        if (!title || !category || !transactionDate) {
            return sendError(res, 400, 'Title, category, and date are required!', 'TRANSACTION_FIELDS_REQUIRED');
        }
        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
            return sendError(res, 400, 'Amount must be a positive number!', 'TRANSACTION_AMOUNT_INVALID');
        }

        transaction.title = String(title).trim();
        transaction.amount = amountNumber;
        transaction.type = normalizedType;
        transaction.category = String(category).trim();
        transaction.description = String(description || '').trim();
        transaction.date = transactionDate;
        transaction.recurring = buildRecurring(recurring);
        if (transaction.recurring.enabled && normalizedType === 'outflow') {
            const previousDue = parseDateOrNull(transaction.recurring.nextDueDate);
            transaction.recurring.nextDueDate = previousDue || getNextRecurringDate(transactionDate, transaction.recurring.frequency);
        } else {
            transaction.recurring.nextDueDate = null;
            transaction.recurring.lastGeneratedAt = null;
        }
        await transaction.save();

        return res.status(200).json(transaction);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'TRANSACTION_UPDATE_ERROR');
    }
};

exports.generateRecurringTransaction = async (req, res) => {
    const { id } = req.params;
    try {
        const template = await Transaction.findById(id);
        if (!template) return sendError(res, 404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
        if (template.user.toString() !== req.user.id) return sendError(res, 401, 'User not authorized', 'TRANSACTION_UNAUTHORIZED');
        if (!template.recurring?.enabled) return sendError(res, 400, 'Transaction is not recurring', 'TRANSACTION_NOT_RECURRING');

        const lastDate = parseDateOrNull(template.date) || new Date();
        const nextDate = getNextRecurringDate(lastDate, template.recurring.frequency);

        const newTransaction = await Transaction.create({
            user: template.user,
            title: template.title,
            amount: template.amount,
            type: template.type || 'outflow',
            category: template.category,
            description: `${template.description} (Auto recurrence)`,
            date: nextDate,
            recurring: template.recurring
        });
        template.recurring.lastGeneratedAt = new Date();
        template.recurring.nextDueDate = getNextRecurringDate(nextDate, template.recurring.frequency);
        await template.save();

        return res.status(201).json(newTransaction);
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'TRANSACTION_RECURRING_GENERATE_ERROR');
    }
};

exports.getRecurringAlerts = async (req, res) => {
    try {
        const now = new Date();
        const dueItems = await Transaction.find({
            user: req.user.id,
            type: { $ne: 'income' },
            'recurring.enabled': true,
            'recurring.nextDueDate': { $ne: null, $lte: now }
        }).sort({ 'recurring.nextDueDate': 1 }).limit(30);

        const alerts = dueItems.map((item) => ({
            _id: item._id,
            title: item.title,
            category: item.category,
            amount: Number(item.amount || 0),
            nextDueDate: item.recurring?.nextDueDate,
            autoCreate: Boolean(item.recurring?.autoCreate),
            frequency: item.recurring?.frequency || 'monthly'
        }));

        return res.json({
            dueCount: alerts.length,
            items: alerts
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'TRANSACTION_RECURRING_ALERTS_ERROR');
    }
};

exports.processRecurringDue = async (req, res) => {
    try {
        const now = new Date();
        const dueTemplates = await Transaction.find({
            user: req.user.id,
            type: { $ne: 'income' },
            'recurring.enabled': true,
            'recurring.autoCreate': true,
            'recurring.nextDueDate': { $ne: null, $lte: now }
        }).limit(50);

        const created = [];
        for (const template of dueTemplates) {
            const dueDate = parseDateOrNull(template.recurring?.nextDueDate) || now;
            const generated = await Transaction.create({
                user: template.user,
                title: template.title,
                amount: template.amount,
                type: template.type || 'outflow',
                category: template.category,
                description: `${template.description} (Auto due)`,
                date: dueDate,
                recurring: template.recurring
            });
            created.push(generated);

            template.recurring.lastGeneratedAt = now;
            template.recurring.nextDueDate = getNextRecurringDate(dueDate, template.recurring.frequency);
            await template.save();
        }

        return res.json({
            createdCount: created.length,
            items: created
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'TRANSACTION_RECURRING_PROCESS_ERROR');
    }
};

exports.deleteTransaction = async (req, res) => {
    const { id } = req.params;
    try {
        const transaction = await Transaction.findById(id);
        if (!transaction) return sendError(res, 404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
        if (transaction.user.toString() !== req.user.id) return sendError(res, 401, 'User not authorized', 'TRANSACTION_UNAUTHORIZED');

        await Transaction.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Transaction deleted' });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'TRANSACTION_DELETE_ERROR');
    }
};
