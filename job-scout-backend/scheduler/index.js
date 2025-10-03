const cron = require('node-cron');
const { runScrapers } = require('../services/scrapingService');
const { calculateMatchScores } = require('../services/matchingService'); // Or keywordMatchingService

function startScheduler() {
    console.log('🚀 Cron job scheduler started.');
    
    // Schedule the main task to run every day at 2:35 AM.
    // Cron format: Minute Hour DayOfMonth Month DayOfWeek
    // '35 2 * * *' means "at minute 35 of hour 2 every day".
    cron.schedule('35 2 * * *', async () => {
        console.log('--- 🕒 Starting Scheduled Nightly Job ---');
        try {
            // 1. Run all scrapers to get fresh job data
            await runScrapers();
            
            // 2. Run the matcher to score the newly added jobs
            await calculateMatchScores();
            
            console.log('--- ✅ Scheduled Nightly Job Finished Successfully ---');
        } catch (error) {
            console.error('--- ❌ An error occurred during the scheduled nightly job ---', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata" // Set to your local timezone
    });
}

module.exports = { startScheduler };
