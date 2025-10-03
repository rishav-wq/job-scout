require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// --- IMPORT ROUTES & SCHEDULER ---
const jobRoutes = require('./routes/jobRoutes');
const profileRoutes = require('./routes/profileRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const { startScheduler } = require('./scheduler'); // <-- 1. IMPORT

const app = express();
const PORT = https://job-scout-chi.vercel.app;

// Database Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/resume', resumeRoutes);


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  
  // --- START THE SCHEDULER ---
  startScheduler(); // <-- 2. CALL THE FUNCTION
  // -------------------------
});

