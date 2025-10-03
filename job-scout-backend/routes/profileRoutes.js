// In routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadResume } = require('../controllers/profileController');

// Configure multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define the route. It will accept a single file with the field name 'resume'
router.post('/resume', upload.single('resume'), uploadResume);

module.exports = router;