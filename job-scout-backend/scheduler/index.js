const cron = require('node-cron');
const { runScrapers } = require('../services/scrapingService');
const { calculateMatchScores } = require('../services/matchingService');
const Job = require('../models/Job');

function startScheduler() {
    console.log('🚀 Cron job scheduler started.');
    
    // Schedule the main task to run every day at 2:40 AM.
    cron.schedule('40 2 * * *', async () => {
        console.log('--- 🕒 Starting Scheduled Nightly Job ---');
        try {
            // 1. Clean old jobs (keep last 15 days only)
            console.log('🗑️  Cleaning old jobs...');
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 15);
            const deleteResult = await Job.deleteMany({ dateScraped: { $lt: cutoffDate } });
            console.log(`✅ Removed ${deleteResult.deletedCount} old jobs (older than 15 days)`);
            
            // 2. Run all scrapers to get fresh job data
            await runScrapers();
            
            // 3. Run the matcher to score the newly added jobs
            await calculateMatchScores();
            
            console.log('--- ✅ Scheduled Nightly Job Finished Successfully ---');
        } catch (error) {
            console.error('--- ❌ An error occurred during the scheduled nightly job ---', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
}

module.exports = { startScheduler };
