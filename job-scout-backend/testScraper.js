// In testScraper.js

require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const { runScrapers } = require('./services/scrapingService');

async function runTest() {
    try {
        // First, connect to the database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- Database Connected for Test ---');
        
        // Now, run the scraping service
        await runScrapers();

    } catch (error) {
        console.error('Test run failed:', error);
    } finally {
        // Disconnect from the database after the test
        await mongoose.disconnect();
        console.log('--- Database Disconnected ---');
    }
}

runTest();
