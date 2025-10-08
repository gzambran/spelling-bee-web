import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.serverUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : window.location.origin;
    this.eventListeners = new Map();
    this.setupVisibilityHandler();
  }

  // Handle browser tab visibility changes
  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('👁️ Tab hidden - connection will be maintained');
      } else {
        console.log('👁️ Tab visible - checking connection');
        this.checkConnection();
      }
    });
  }

  // Check and restore connection if needed
  checkConnection() {
    if (this.socket && !this.socket.connected) {
      console.log('🔄 Connection lost while tab was hidden, reconnecting...');
      this.socket.connect();
    }
  }

  // Connect to the server
  connect() {
    if (this.socket) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to server:', this.serverUrl);
      
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'], // Allow fallback to polling
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        // Aggressive heartbeat settings to keep connection alive indefinitely
        pingInterval: 10000,   // Send ping every 10 seconds (frequent)
        pingTimeout: 300000    // Wait 5 minutes for pong (very tolerant of throttling)
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server:', this.socket.id);
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection failed:', error.message);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('📴 Disconnected from server:', reason);
        
        // Auto-reconnect for certain disconnect reasons
        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          console.log('🔄 Server disconnected us, attempting reconnect...');
          this.socket.connect();
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
      });
    });
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from server...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Generic emit with promise-based response and timeout
  emitWithCallback(event, data = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected to server'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout: Please try again`));
      }, 10000);

      this.socket.emit(event, data, (response) => {
        clearTimeout(timeout);
        
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Request failed. Please try again.'));
        }
      });
    });
  }

  // Room management methods
  async createRoom(playerName) {
    const response = await this.emitWithCallback('create-room', { playerName });
    console.log('🏠 Room created:', response.roomCode);
    return response;
  }

  async joinRoom(roomCode, playerName) {
    const response = await this.emitWithCallback('join-room', { roomCode, playerName });
    console.log('🚪 Joined room:', roomCode);
    return response;
  }

  // Game control methods
  async setPlayerReady(ready = true) {
    const response = await this.emitWithCallback('player-ready', { ready });
    console.log('✅ Player ready status set:', ready);
    return response;
  }

  // Submit complete round results to server
  async submitRoundResults(words, totalScore) {
    const response = await this.emitWithCallback('submit-round-results', { words, totalScore });
    console.log('📊 Round results submitted:', words.length, 'words,', totalScore, 'points');
    return response;
  }

  // Event listener management
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    this.eventListeners.get(event).push(callback);

    // If socket exists, set up the listener immediately
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    // Remove from socket if it exists
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Set up all stored event listeners when socket connects/reconnects
  setupEventListeners() {
    if (!this.socket) return;

    // Remove all existing listeners first to prevent duplicates
    this.socket.removeAllListeners();
    
    // Re-add the core connection listeners
    this.socket.on('connect', () => {
      console.log('✅ Reconnected to server:', this.socket.id);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('📴 Disconnected from server:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    // Set up all stored event listeners
    for (const [event, callbacks] of this.eventListeners.entries()) {
      callbacks.forEach(callback => {
        this.socket.on(event, callback);
      });
    }
    
    console.log('✅ Event listeners set up, total events:', this.eventListeners.size);
  }

  // Check if currently connected
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;