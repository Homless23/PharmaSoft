const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Category = require('../models/Category');
const { cleanupCategoryDuplicatesForUser } = require('../utils/categoryCleanup');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const run = async () => {
    try {
        await connectDB();
        const userIds = await Category.distinct('user', { user: { $ne: null } });
        if (!userIds.length) {
            console.log('No category data found.');
            process.exit(0);
        }

        let totalRemoved = 0;
        let totalUpdated = 0;
        let totalGroups = 0;

        for (const userId of userIds) {
            // Sequential loop keeps this safe on small VPS environments.
            // eslint-disable-next-line no-await-in-loop
            const result = await cleanupCategoryDuplicatesForUser(userId);
            totalRemoved += Number(result.removed || 0);
            totalUpdated += Number(result.updated || 0);
            totalGroups += Number(result.groupsWithDuplicates || 0);
            console.log(
                `User ${result.userId}: removed=${result.removed}, updated=${result.updated}, duplicateGroups=${result.groupsWithDuplicates}`
            );
        }

        console.log('Cleanup complete.');
        console.log(`Users processed: ${userIds.length}`);
        console.log(`Duplicate groups: ${totalGroups}`);
        console.log(`Removed: ${totalRemoved}`);
        console.log(`Updated: ${totalUpdated}`);
        process.exit(0);
    } catch (error) {
        console.log('Cleanup failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
};

run();
