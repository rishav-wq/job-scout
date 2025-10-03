// clearPhonePe.js
require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');

async function clearPhonePe() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('--- Database Connected ---');
        
        // Delete only PhonePe jobs
        const result = await Job.deleteMany({ company: 'PhonePe' });
        console.log(`✅ Deleted ${result.deletedCount} PhonePe jobs from database`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('--- Database Disconnected ---');
        process.exit(0);
    }
}

clearPhonePe();
