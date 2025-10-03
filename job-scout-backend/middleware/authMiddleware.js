// In middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Load JWT_SECRET from .env

exports.protect = (req, res, next) => {
  let token;

  // 1. Check if Authorization header exists and is in "Bearer <token>" format
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach userId to request
      req.userId = decoded.id; // Now available as req.userId

      // Proceed to the next middleware/route handler
      next();

    } catch (error) {
      // If token verification fails (e.g., expired, invalid signature)
      console.error('JWT verification failed:', error.message); // Log error for debugging
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    // 2. If no token or malformed token in header
    return res.status(401).json({ message: 'Not authorized, no token or invalid format' });
  }

  // No need for the 'if (!token)' outside the block, as we've handled all cases.
};