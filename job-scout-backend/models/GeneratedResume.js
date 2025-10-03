const mongoose = require('mongoose');

const generatedResumeSchema = new mongoose.Schema({
    jobId: { type: String, required: true },
    userId: { type: String, required: true },
    status: {
        type: String,
        enum: ['processing', 'completed', 'failed'],
        default: 'processing',
    },
    downloadUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
});

const GeneratedResume = mongoose.model('GeneratedResume', generatedResumeSchema);

module.exports = GeneratedResume;
