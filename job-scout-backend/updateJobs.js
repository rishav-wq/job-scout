require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job'); // Make sure the path is correct

async function addMatchScoreField() {
    console.log('--- Starting Database Update Script ---');
    let connection;
    try {
        connection = await mongoose.connect(process.env.MONGO_URI);
        console.log('Database Connected.');

        // The query to find documents where the 'matchScore' field does not exist
        const filter = { "matchScore": { "$exists": false } };
        
        // The update operation to add the field with a default value
        const updateOperation = { "$set": { "matchScore": -1 } };

        console.log('Finding jobs without a matchScore and adding it...');
        const result = await Job.updateMany(filter, updateOperation);

        console.log('--- Update Complete ---');
        console.log(`Documents matched: ${result.matchedCount}`);
        console.log(`Documents modified: ${result.modifiedCount}`);
        console.log('Your database is now ready for the matching service!');

    } catch (error) {
        console.error('An error occurred during the update:', error);
    } finally {
        if (connection) {
            await mongoose.disconnect();
            console.log('Database Disconnected.');
        }
    }
}

addMatchScoreField();