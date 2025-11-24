// Manual script to update jobs immediately
require('dotenv').config();
const mongoose = require('mongoose');
const { runScrapers } = require('./services/scrapingService');
const { calculateMatchScores } = require('./services/matchingService');

async function updateJobsNow() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');
        
        console.log('\n🕷️  Starting job scraping...');
        await runScrapers();
        
        console.log('\n🎯 Calculating match scores...');
        await calculateMatchScores();
        
        console.log('\n✅ Job update completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating jobs:', error);
        process.exit(1);
    }
}

updateJobsNow();
