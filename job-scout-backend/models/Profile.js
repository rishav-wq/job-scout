// In models/Profile.js
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userId: { // In a real app, this would link to a User model
        type: String,
        required: true,
        unique: true,
    },
    resumeText: {
        type: String,
        default: '',
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;