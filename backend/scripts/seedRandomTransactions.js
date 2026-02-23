const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const INCOME_CATEGORY_NAMES = ['Retail Sales', 'Online Orders', 'Insurance Claims', 'Clinic Supplies', 'Wholesale'];
const OUTFLOW_FALLBACK_CATEGORIES = ['Medicine Procurement', 'Supplier Payments', 'Utilities', 'Staff Salaries', 'Rent', 'Equipment', 'Other'];
const OUTFLOW_TITLES = [
    'Bulk Antibiotic Purchase', 'Analgesic Refill', 'Cold Storage Service',
    'Supplier Settlement', 'Pharmacy Shelf Restock', 'OTC Restock',
    'Prescription Inventory Refill', 'Utility Bill', 'Packaging Material Purchase',
    'Dispensing Equipment Maintenance', 'POS Subscription', 'Warehouse Handling Fee'
];
const INCOME_TITLES = [
    'Counter Sales', 'Insurance Reimbursement', 'Online Pharmacy Sales', 'Clinic Supply Invoice', 'Wholesale Dispatch'
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const randomPastDate = (daysBack = 90) => {
    const now = Date.now();
    const backMs = rand(0, daysBack) * 24 * 60 * 60 * 1000;
    const d = new Date(now - backMs);
    d.setHours(rand(7, 21), rand(0, 59), rand(0, 59), 0);
    return d;
};

const run = async () => {
    try {
        await connectDB();

        const args = process.argv.slice(2);
        const targetAdmin = args.includes('--admin');
        const emailArgRaw = args.find((a) => a.startsWith('--email='));
        const targetEmail = emailArgRaw ? String(emailArgRaw.split('=')[1] || '').trim().toLowerCase() : '';

        let query = { role: { $ne: 'admin' } };
        if (targetAdmin) {
            query = { role: 'admin' };
        }
        if (targetEmail) {
            query = { email: targetEmail };
        }

        const targetUser = await User.findOne(query)
            .sort({ lastLoginAt: -1, updatedAt: -1, createdAt: -1 });

        if (!targetUser) {
            console.log('No matching user found for seeding.');
            process.exit(0);
        }

        const categories = await Category.find({ user: targetUser._id, active: { $ne: false } }).select('name');
        const userCategoryNames = categories.map((c) => String(c.name || '').trim()).filter(Boolean);

        const incomeCategories = Array.from(new Set([
            ...userCategoryNames.filter((name) => INCOME_CATEGORY_NAMES.map((i) => i.toLowerCase()).includes(name.toLowerCase())),
            ...INCOME_CATEGORY_NAMES
        ]));

        const outflowCategories = Array.from(new Set([
            ...userCategoryNames.filter((name) => !INCOME_CATEGORY_NAMES.map((i) => i.toLowerCase()).includes(name.toLowerCase())),
            ...OUTFLOW_FALLBACK_CATEGORIES
        ]));

        const outflowCount = 45;
        const incomeCount = 16;
        const docs = [];

        for (let i = 0; i < outflowCount; i += 1) {
            docs.push({
                user: targetUser._id,
                type: 'outflow',
                title: pick(OUTFLOW_TITLES),
                amount: rand(80, 2500),
                category: pick(outflowCategories),
                description: '',
                date: randomPastDate(120),
                recurring: { enabled: false, frequency: 'monthly', autoCreate: false }
            });
        }

        for (let i = 0; i < incomeCount; i += 1) {
            docs.push({
                user: targetUser._id,
                type: 'income',
                title: pick(INCOME_TITLES),
                amount: rand(1200, 18000),
                category: pick(incomeCategories),
                description: '',
                date: randomPastDate(120),
                recurring: { enabled: false, frequency: 'monthly', autoCreate: false }
            });
        }

        await Transaction.insertMany(docs, { ordered: false });

        console.log(`Seeded ${outflowCount} outflow entries and ${incomeCount} incomes for: ${targetUser.email} (${targetUser.role})`);
        process.exit(0);
    } catch (error) {
        console.log('Seeding failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
};

run();


