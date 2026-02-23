const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const { runSnapshotCycle } = require('../services/backupScheduler');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await runSnapshotCycle();
    console.log(`Manual backup snapshot run completed for ${count} admin tenant(s).`);
    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error('runBackupSnapshotNow failed:', error.message);
    try {
        await mongoose.disconnect();
    } catch (_disconnectError) {}
    process.exit(1);
});

