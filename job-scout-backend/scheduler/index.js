const cron = require('node-cron');
const { runScrapers } = require('../services/scrapingService');
const { calculateMatchScores } = require('../services/matchingService'); // Or keywordMatchingService

function startScheduler() {
    console.log('🚀 Cron job scheduler started.');

    // Schedule the main task to run every day at 3:00 AM.
    // Cron format: Minute Hour DayOfMonth Month DayOfWeek
    // '0 3 * * *' means "at minute 0 of hour 3 every day".
    cron.schedule('0 3 * * *', async () => {
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
