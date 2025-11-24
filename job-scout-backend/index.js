// In index.js

// IMPORTANT: This must be at the very top of the file
require('dotenv').config(); 

const profileRoutes = require('./routes/profileRoutes');
const express = require('express');
const mongoose = require('mongoose'); // Import mongoose
const cors = require('cors');
// --- IMPORT YOUR ROUTE ---
// We are importing the router we created in the routes folder
const jobRoutes = require('./routes/jobRoutes');
const { startScheduler } = require('./scheduler'); // Import scheduler

// Create an instance of an Express application
const app = express();

const PORT = process.env.PORT || 8000;

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        // Exit process with failure
        process.exit(1);
    }
};

// Call the function to connect to the DB
connectDB();
// -------------------------

// --- MIDDLEWARE ---
// Enable CORS for all routes
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://job-scout-chi.vercel.app',
    'https://job-scout-1.onrender.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // For development, allow all origins
            if (process.env.NODE_ENV !== 'production') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
// ------------------

// --- MIDDLEWARE TO USE ROUTES ---
// This is the crucial new part. It tells Express that any URL
// that starts with '/api/v1/jobs' should be handed over to our 'jobRoutes' router.
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/profile', profileRoutes);
// --------------------------------


// A basic route for the root URL, good for testing if the server is up.
app.get('/', (req, res) => {
  res.send('Hello, World! The server is running and connected to the DB.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  // Start the cron job scheduler
  startScheduler();
});