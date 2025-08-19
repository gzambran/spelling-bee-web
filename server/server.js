const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import game modules
const wordData = require('./wordData');
const socketHandlers = require('./socketHandlers');

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Configure Socket.io
const io = socketIo(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(express.json());

// Serve static files from React build - FIXED PATH
app.use(express.static(path.join(__dirname, 'client/dist')));

// Initialize word data on server startup
async function initializeServer() {
  try {
    console.log('🚀 Initializing Spelling Bee Duel Server...');
    await wordData.loadPuzzleData();
    console.log('✅ Server initialization complete');
  } catch (error) {
    console.error('❌ Server initialization failed:', error.message);
    process.exit(1);
  }
}

// Basic endpoints
app.get('/health', (req, res) => {
  const roomManager = require('./roomManager');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Spelling Bee Duel Server Running',
    stats: roomManager.getStats()
  });
});

app.get('/api', (req, res) => {
  const roomManager = require('./roomManager');
  res.json({
    name: 'Spelling Bee Duel Server',
    version: '1.0.0',
    status: 'running',
    stats: roomManager.getStats()
  });
});

// Puzzle statistics endpoint
app.get('/api/puzzle-stats', (req, res) => {
  try {
    const stats = wordData.getStats();
    res.json({
      success: true,
      data: {
        totalPuzzles: stats.totalPuzzles,
        dateRange: stats.dateRange,
        oldestDate: stats.oldestDate,
        newestDate: stats.newestDate,
        loaded: stats.loaded
      }
    });
  } catch (error) {
    console.error('Error getting puzzle stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get puzzle statistics'
    });
  }
});

// Socket.io handling
socketHandlers.setupSocketHandlers(io);

// Catch all handler - send React app for any route not handled above - FIXED PATH
// This must be AFTER all API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down server...');
  const roomManager = require('./roomManager');
  roomManager.cleanup();
  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const PORT = process.env.PORT || 3000;

// Initialize and start server
initializeServer().then(() => {
  server.listen(PORT, () => {
    console.log(`🎯 Spelling Bee Duel server running on port ${PORT}`);
    console.log(`🔌 Socket.io ready for connections`);
    console.log(`📚 Loaded ${wordData.getStats().totalPuzzles} puzzles`);
  });
});