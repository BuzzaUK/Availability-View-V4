const jwt = require('jsonwebtoken');
const memoryDB = require('../utils/memoryDB');

// Middleware to protect routes
exports.authenticateJWT = async (req, res, next) => {
  let token;
  
  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Get user from token
    const user = await memoryDB.findUserById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Set req.user with both the decoded token data and full user object
    req.user = {
      id: decoded.id,  // This ensures req.user.id works
      _id: user._id,   // This maintains compatibility with existing code
      role: decoded.role,
      ...user
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Middleware to authorize by role
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Middleware to authenticate ESP32 devices
exports.authenticateDevice = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required for device authentication'
    });
  }
  
  // In a real implementation, you would validate the API key against a database
  // For now, we'll use a simple check against an environment variable
  if (apiKey !== process.env.ESP32_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }
  
  next();
};