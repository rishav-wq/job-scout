const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    url: {
        type: String,
        required: true,
        // REMOVE unique: true completely
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

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
