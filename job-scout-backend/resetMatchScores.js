// Script to reset all match scores to -1
require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');

async function resetAllScores() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected\n');

        const totalJobs = await Job.countDocuments({});
        console.log(`📊 Total jobs in database: ${totalJobs}\n`);

        console.log('⚠️  This will reset ALL match scores to -1');
        console.log('   You will need to run matchAllJobs.js again to recalculate them.\n');

        console.log('🔄 Resetting all match scores...');
        const result = await Job.updateMany(
            {},
            { $set: { matchScore: -1 } }
        );

        console.log(`✅ Reset complete! ${result.modifiedCount} jobs updated.\n`);
        console.log('💡 Next step: Run "node matchAllJobs.js" to calculate matches.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetAllScores();
