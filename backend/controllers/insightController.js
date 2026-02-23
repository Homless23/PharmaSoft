const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Bill = require('../models/Bill');
const Purchase = require('../models/Purchase');
const { sendError } = require('../utils/apiResponse');
const getInventoryOwnerId = (req) => String(req.user?.ownerAdmin || req.user?.id || req.user?._id || '');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const sumTransactionAmount = (items) => items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

exports.getInsights = async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const now = new Date();
        const thisWeekStart = new Date(now.getTime() - WEEK_MS);
        const prevWeekStart = new Date(now.getTime() - (2 * WEEK_MS));

        const [allTransactions, categories] = await Promise.all([
            Transaction.find({
                user: inventoryOwnerId,
                type: { $ne: 'income' },
                date: { $gte: prevWeekStart }
            }).select('amount category date'),
            Category.find({ user: inventoryOwnerId }).select('name budget')
        ]);

        const thisWeek = allTransactions.filter((item) => new Date(item.date) >= thisWeekStart);
        const prevWeek = allTransactions.filter((item) => {
            const date = new Date(item.date);
            return date >= prevWeekStart && date < thisWeekStart;
        });

        const thisWeekTotal = sumTransactionAmount(thisWeek);
        const prevWeekTotal = sumTransactionAmount(prevWeek);
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
        const monthTransactions = await Transaction.find({
            user: inventoryOwnerId,
            type: { $ne: 'income' },
            date: { $gte: monthStart }
        }).select('amount');

        const monthlySpent = sumTransactionAmount(monthTransactions);
        const monthlyBudget = categories.reduce((sum, c) => sum + Number(c.budget || 0), 0);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const projected = (monthlySpent / Math.max(now.getDate(), 1)) * daysInMonth;

        const insights = [];
        insights.push({
            code: 'WEEKLY_CHANGE',
            severity: weekDeltaPercent > 15 ? 'warning' : 'info',
            title: 'Weekly procurement movement',
            detail: `This week is ${weekDeltaPercent >= 0 ? '+' : ''}${weekDeltaPercent.toFixed(1)}% vs last week.`
        });

        if (categoryShift) {
            insights.push({
                code: 'CATEGORY_SHIFT',
                severity: categoryShift.delta > 20 ? 'warning' : 'info',
                title: 'Inventory category change',
                detail: `${categoryShift.category} moved ${categoryShift.delta >= 0 ? '+' : ''}${categoryShift.delta.toFixed(1)}% week over week.`
            });
        }

        if (monthlyBudget > 0) {
            insights.push({
                code: 'BUDGET_RUN_RATE',
                severity: projected > monthlyBudget ? 'danger' : 'success',
                title: 'Stock budget run rate',
                detail: `Projected month-end procurement is Rs ${Math.round(projected).toLocaleString()} vs budget Rs ${Math.round(monthlyBudget).toLocaleString()}.`
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
        return sendError(res, 500, 'Server Error', 'INSIGHTS_FETCH_ERROR');
    }
};

// GET /api/v1/dashboard/summary
exports.getDashboardSummary = async (req, res) => {
    try {
        const inventoryOwnerId = getInventoryOwnerId(req);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const trendStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

        const [todayBills, monthPurchases, activeCategories, trendBills, trendPurchases] = await Promise.all([
            Bill.find({
                user: inventoryOwnerId,
                status: { $ne: 'voided' },
                billDate: { $gte: todayStart, $lt: tomorrowStart }
            }).select('grandTotal paymentMethod'),
            Purchase.find({
                user: inventoryOwnerId,
                purchaseDate: { $gte: monthStart }
            }).select('subtotal amountPaid paymentStatus'),
            Category.find({ user: inventoryOwnerId, active: { $ne: false } }).select('stockQty reorderPoint expiryDate'),
            Bill.find({
                user: inventoryOwnerId,
                status: { $ne: 'voided' },
                billDate: { $gte: trendStart, $lt: tomorrowStart }
            }).select('billDate grandTotal'),
            Purchase.find({
                user: inventoryOwnerId,
                purchaseDate: { $gte: trendStart, $lt: tomorrowStart }
            }).select('purchaseDate subtotal')
        ]);

        const salesToday = todayBills.reduce((sum, bill) => sum + Number(bill?.grandTotal || 0), 0);
        const procurementMonth = monthPurchases.reduce((sum, purchase) => sum + Number(purchase?.subtotal || 0), 0);
        const paidMonth = monthPurchases.reduce((sum, purchase) => sum + Number(purchase?.amountPaid || 0), 0);
        const dueMonth = Math.max(procurementMonth - paidMonth, 0);

        const inventory = activeCategories.reduce((acc, item) => {
            const stockQty = Math.max(Number(item?.stockQty || 0), 0);
            const reorderPoint = Math.max(Number(item?.reorderPoint ?? 10) || 0, 0);
            if (stockQty < reorderPoint) acc.lowStock += 1;

            const expiryDate = item?.expiryDate ? new Date(item.expiryDate) : null;
            if (expiryDate && !Number.isNaN(expiryDate.getTime()) && stockQty > 0) {
                const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                if (diffDays < 0) {
                    acc.expired += 1;
                } else if (diffDays <= 60) {
                    acc.nearExpiry += 1;
                }
            }
            return acc;
        }, { lowStock: 0, nearExpiry: 0, expired: 0 });

        const dayKeys = [];
        for (let i = 6; i >= 0; i -= 1) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            dayKeys.push(d.toISOString().slice(0, 10));
        }
        const salesByDay = {};
        const purchasesByDay = {};
        dayKeys.forEach((key) => {
            salesByDay[key] = 0;
            purchasesByDay[key] = 0;
        });
        trendBills.forEach((bill) => {
            const key = new Date(bill.billDate).toISOString().slice(0, 10);
            if (Object.prototype.hasOwnProperty.call(salesByDay, key)) {
                salesByDay[key] += Number(bill?.grandTotal || 0);
            }
        });
        trendPurchases.forEach((purchase) => {
            const key = new Date(purchase.purchaseDate).toISOString().slice(0, 10);
            if (Object.prototype.hasOwnProperty.call(purchasesByDay, key)) {
                purchasesByDay[key] += Number(purchase?.subtotal || 0);
            }
        });
        const trend = dayKeys.map((date) => ({
            date,
            sales: Number(salesByDay[date].toFixed(2)),
            purchases: Number(purchasesByDay[date].toFixed(2))
        }));

        return res.json({
            generatedAt: new Date().toISOString(),
            sales: {
                today: Number(salesToday.toFixed(2)),
                billsCountToday: todayBills.length
            },
            procurement: {
                monthTotal: Number(procurementMonth.toFixed(2)),
                monthPaid: Number(paidMonth.toFixed(2)),
                monthDue: Number(dueMonth.toFixed(2)),
                purchasesCountMonth: monthPurchases.length
            },
            inventory,
            trend
        });
    } catch (error) {
        console.log(error);
        return sendError(res, 500, 'Server Error', 'DASHBOARD_SUMMARY_FETCH_ERROR');
    }
};

