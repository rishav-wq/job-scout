// require('dotenv').config();
// const mongoose = require('mongoose');
// // We are now importing from our new keyword-based service
// const { calculateMatchScores } = require('./services/matchingService');

// async function runMatcherTest() {
//     console.log('--- Starting Keyword Matcher Test ---');
//     try {
//         await mongoose.connect(process.env.MONGO_URI);
//         console.log('Database Connected for Matcher Test.');
        
//         // This now runs the keyword-based logic
//         await calculateMatchScores();

//     } catch (error) {
//         console.error('Matcher test run failed:', error);
//     } finally {
//         await mongoose.disconnect();
//         console.log('Database Disconnected.');
//         console.log('--- Matcher Test Finished ---');
//     }
// }

// runMatcherTest();

require('dotenv').config();
const mongoose = require('mongoose');
const { calculateMatchScores, testCohereConnection } = require('./services/matchingService');

async function runMatcherTest() {
    console.log('--- Starting Cohere Matcher Test ---');
    let connection;
    try {
        // First, test the API connection using the function you built
        const isApiWorking = await testCohereConnection();
        if (!isApiWorking) {
            console.log('Aborting test due to API connection issue.');
            return;
        }

        // If the API is good, connect to the database
        connection = await mongoose.connect(process.env.MONGO_URI);
        console.log('Database Connected for Matcher Test.');
        
        // Run the main matching function from your service
        await calculateMatchScores();

    } catch (error) {
        console.error('Matcher test run failed:', error);
    } finally {
        if (connection) {
            await mongoose.disconnect();
            console.log('Database Disconnected.');
        }
        console.log('--- Matcher Test Finished ---');
    }
}

runMatcherTest();

