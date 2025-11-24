// In models/Job.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true, // Removes whitespace from the beginning and end
    },
    url: {
        type: String,
        required: true,
        unique: true, // We don't want to save the same job URL twice
    },
    company: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        default: 'Not specified',
    },
    dateScraped: {
        type: Date,
        default: Date.now,
    },
    description: {
        type: String,
        default: 'No description available.',
    },
    matchScore: {
    type: Number,
    default: -1,
    },
});

// Create the model from the schema
const Job = mongoose.model('Job', jobSchema);

module.exports = Job;