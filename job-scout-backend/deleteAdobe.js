// clearAdobe.js
require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');

async function clearAdobe() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- Database Connected ---');
        
        // Delete only Adobe jobs
        const result = await Job.deleteMany({ company: 'Adobe' });
        console.log(`✅ Deleted ${result.deletedCount} Adobe jobs from database`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('--- Database Disconnected ---');
        process.exit(0);
    }
}

clearAdobe();
