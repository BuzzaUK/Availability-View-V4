const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Using in-memory database for development
console.log('Using in-memory database for development - server starting...');

// Import routes
const assetRoutes = require('./routes/assetRoutes');
const authRoutes = require('./routes/authRoutes');
const configRoutes = require('./routes/configRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const archiveRoutes = require('./routes/archiveRoutes');
const eventRoutes = require('./routes/eventRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const userRoutes = require('./routes/userRoutes');
const backupRoutes = require('./routes/backupRoutes');

// Import middleware
const { authenticateJWT } = require('./middleware/authMiddleware');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/api/assets', assetRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/config', authenticateJWT, configRoutes);
app.use('/api/analytics', authenticateJWT, analyticsRoutes);
app.use('/api/archives', authenticateJWT, archiveRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/reports', authenticateJWT, reportRoutes);
app.use('/api/settings', authenticateJWT, settingsRoutes);
app.use('/api/shifts', require('./routes/shiftRoutes'));
app.use('/api/users', authenticateJWT, userRoutes);
app.use('/api/backups', authenticateJWT, backupRoutes);

// ESP32 asset state update endpoint
app.post('/api/asset-state', (req, res) => {
  const { asset_name, pin_number, is_running, timestamp } = req.body;
  
  console.log(`Received update from ${asset_name}: ${is_running ? 'RUNNING' : 'STOPPED'}`);
  
  // Emit the state change to all connected clients
  io.emit('asset_state_change', {
    asset_name,
    pin_number,
    state: is_running ? 'RUNNING' : 'STOPPED',
    timestamp: new Date().toISOString(),
    raw_timestamp: timestamp
  });
  
  res.status(200).json({ success: true });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});