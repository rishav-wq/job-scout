// Script to remove old jobs and keep only recent listings (last 15 days)
require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');

async function cleanOldJobs(daysToKeep = 15) {
    try {
        console.log('🔄 Connecting to MongoDB...\n');
        await mongoose.connect(process.env.MONGO_URI);

        // Calculate the cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        console.log(`📅 Keeping jobs from: ${cutoffDate.toLocaleDateString()}`);
        console.log(`🗑️  Removing jobs older than ${daysToKeep} days\n`);

        // Get statistics before deletion
        const totalJobs = await Job.countDocuments({});
        const oldJobs = await Job.countDocuments({ dateScraped: { $lt: cutoffDate } });
        const recentJobs = totalJobs - oldJobs;

        console.log('📊 CURRENT DATABASE STATUS:');
        console.log('═'.repeat(60));
        console.log(`  Total jobs: ${totalJobs}`);
        console.log(`  Jobs to keep (last ${daysToKeep} days): ${recentJobs}`);
        console.log(`  Jobs to remove (older than ${daysToKeep} days): ${oldJobs}`);
        console.log('═'.repeat(60));
        console.log();

        if (oldJobs === 0) {
            console.log('✅ No old jobs to remove! Database is clean.\n');
            process.exit(0);
        }

        // Get breakdown by company
        console.log('📈 JOBS TO BE REMOVED BY COMPANY:');
        console.log('─'.repeat(60));
        const oldJobsByCompany = await Job.aggregate([
            { $match: { dateScraped: { $lt: cutoffDate } } },
            { $group: { _id: '$company', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        oldJobsByCompany.forEach(item => {
            console.log(`  ${item._id}: ${item.count} jobs`);
        });
        console.log('─'.repeat(60));
        console.log();

        // Delete old jobs
        console.log('🗑️  Deleting old jobs...');
        const deleteResult = await Job.deleteMany({ dateScraped: { $lt: cutoffDate } });

        console.log(`✅ Successfully removed ${deleteResult.deletedCount} old jobs!\n`);

        // Show final statistics
        const finalTotal = await Job.countDocuments({});
        console.log('📊 FINAL DATABASE STATUS:');
        console.log('═'.repeat(60));
        console.log(`  Total jobs remaining: ${finalTotal}`);
        console.log(`  Jobs removed: ${deleteResult.deletedCount}`);
        console.log('═'.repeat(60));
        console.log();

        // Show breakdown by company after cleanup
        console.log('📈 REMAINING JOBS BY COMPANY:');
        console.log('─'.repeat(60));
        const remainingByCompany = await Job.aggregate([
            { $group: { _id: '$company', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        remainingByCompany.forEach(item => {
            console.log(`  ${item._id}: ${item.count} jobs`);
        });
        console.log('─'.repeat(60));
        console.log();

        console.log('✅ Database cleanup complete!\n');
        console.log('💡 Run "node matchAllJobs.js" if you want to recalculate match scores for remaining jobs.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Get days from command line argument or use default (15)
const daysToKeep = parseInt(process.argv[2]) || 15;
cleanOldJobs(daysToKeep);
