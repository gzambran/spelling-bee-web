const wordData = require('./wordData');
const gameLogic = require('./gameLogic');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> game object
    this.playerRooms = new Map(); // playerId -> roomCode
    this.roomTimers = new Map(); // roomCode -> timer objects
    this.COUNTDOWN_DURATION = 3; // 3 seconds countdown
    this.ROUND_DURATION = 90; // 90 seconds per round
    this.MAX_PLAYERS = 8; // Updated from 2 to 8
    this.MIN_PLAYERS = 2; // Minimum players to start
  }

  // Generate a unique 4-digit room code
  generateRoomCode() {
    let code;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      attempts++;
    } while (this.rooms.has(code) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique room code');
    }

    return code;
  }

  // Create a new game room
  createRoom(playerId, playerName) {
    try {
      // Check if player is already in a room
      if (this.playerRooms.has(playerId)) {
        const existingRoom = this.playerRooms.get(playerId);
        throw new Error(`Player already in room ${existingRoom}`);
      }

      // Generate room code and get random puzzle
      const roomCode = this.generateRoomCode();
      const puzzle = wordData.getRandomPuzzle();
      
      // Create new game
      const game = gameLogic.createGame(roomCode, puzzle);
      
      // Add creator as first player
      gameLogic.addPlayer(game, playerId, playerName);
      
      // Store room and player mapping
      this.rooms.set(roomCode, game);
      this.playerRooms.set(playerId, roomCode);

      console.log(`🏠 Room ${roomCode} created by ${playerName}`);

      return {
        roomCode,
        game: gameLogic.getGameState(game),
        playerCount: 1,
        maxPlayers: this.MAX_PLAYERS // Updated to use constant
      };
    } catch (error) {
      console.error(`❌ Error creating room:`, error.message);
      throw error;
    }
  }

  // Join an existing room
  joinRoom(roomCode, playerId, playerName) {
    try {
      // Check if player is already in a room
      if (this.playerRooms.has(playerId)) {
        const existingRoom = this.playerRooms.get(playerId);
        if (existingRoom === roomCode) {
          // Player rejoining same room
          return this.rejoinRoom(roomCode, playerId, playerName);
        }
        throw new Error(`Player already in room ${existingRoom}`);
      }

      // Check if room exists
      const game = this.rooms.get(roomCode);
      if (!game) {
        throw new Error('Room not found');
      }

      // Check if room is full - Updated from 2 to MAX_PLAYERS
      if (Object.keys(game.players).length >= this.MAX_PLAYERS) {
        throw new Error('Room is full');
      }

      // Add player to game
      gameLogic.addPlayer(game, playerId, playerName);
      this.playerRooms.set(playerId, roomCode);

      console.log(`🚪 ${playerName} joined room ${roomCode}`);

      return {
        roomCode,
        game: gameLogic.getGameState(game),
        playerCount: Object.keys(game.players).length,
        maxPlayers: this.MAX_PLAYERS // Updated from 2
      };
    } catch (error) {
      console.error(`❌ Error joining room ${roomCode}:`, error.message);
      throw error;
    }
  }

  // Rejoin an existing room (for reconnections)
  rejoinRoom(roomCode, playerId, playerName) {
    try {
      const game = this.rooms.get(roomCode);
      if (!game) {
        throw new Error('Room not found');
      }

      // Update player connection status
      if (game.players[playerId]) {
        game.players[playerId].connected = true;
        if (playerName) {
          game.players[playerId].name = playerName;
        }
        console.log(`🔄 ${playerName} reconnected to room ${roomCode}`);
      } else {
        throw new Error('Player not found in room');
      }

      return {
        roomCode,
        game: gameLogic.getGameState(game),
        playerCount: Object.keys(game.players).length,
        maxPlayers: this.MAX_PLAYERS, // Updated from 2
        rejoined: true
      };
    } catch (error) {
      console.error(`❌ Error rejoining room ${roomCode}:`, error.message);
      throw error;
    }
  }

  // Leave a room
  leaveRoom(playerId) {
    try {
      const roomCode = this.playerRooms.get(playerId);
      if (!roomCode) {
        return null; // Player not in any room
      }

      const game = this.rooms.get(roomCode);
      if (!game) {
        this.playerRooms.delete(playerId);
        return null;
      }

      // Mark player as disconnected instead of removing immediately
      if (game.players[playerId]) {
        game.players[playerId].connected = false;
        console.log(`📴 Player ${game.players[playerId].name} disconnected from room ${roomCode}`);
      }

      this.playerRooms.delete(playerId);

      // Check if room should be cleaned up
      const connectedPlayers = Object.values(game.players).filter(p => p.connected);
      
      if (connectedPlayers.length === 0) {
        // No connected players, schedule room cleanup
        this.scheduleRoomCleanup(roomCode);
      }

      return {
        roomCode,
        remainingPlayers: connectedPlayers.length
      };
    } catch (error) {
      console.error(`❌ Error leaving room:`, error.message);
      throw error;
    }
  }

  // Get room information
  getRoomInfo(roomCode) {
    const game = this.rooms.get(roomCode);
    if (!game) {
      throw new Error('Room not found');
    }

    return {
      roomCode,
      game: gameLogic.getGameState(game),
      playerCount: Object.keys(game.players).length,
      connectedPlayers: Object.values(game.players).filter(p => p.connected).length,
      maxPlayers: this.MAX_PLAYERS // Updated from 2
    };
  }

  // Start a round with countdown and server-controlled timer
  startRoundWithTimer(roomCode, io) {
    try {
      const game = this.rooms.get(roomCode);
      if (!game) {
        throw new Error('Room not found');
      }

      const nextRound = game.currentRound + 1;
      
      console.log(`⏰ Starting countdown for round ${nextRound} in room ${roomCode}`);
      
      // Clear any existing timers
      this.clearRoundTimer(roomCode);

      // Start countdown
      io.to(roomCode).emit('countdown-started', {
        countdown: this.COUNTDOWN_DURATION,
        nextRound: nextRound
      });

      // Start actual round after countdown
      const countdownTimer = setTimeout(() => {
        try {
          const roundInfo = gameLogic.startRound(game);
          
          // Emit round started event
          io.to(roomCode).emit('round-started', {
            roundInfo,
            gameState: gameLogic.getGameState(game)
          });

          // Start server-controlled timer with broadcasts
          this.startServerTimer(roomCode, io);

        } catch (error) {
          console.error(`❌ Error starting round after countdown for room ${roomCode}:`, error.message);
        }
      }, this.COUNTDOWN_DURATION * 1000);

      // Store countdown timer reference
      if (!this.roomTimers.has(roomCode)) {
        this.roomTimers.set(roomCode, {});
      }
      this.roomTimers.get(roomCode).countdownTimer = countdownTimer;

      return {
        countdown: this.COUNTDOWN_DURATION,
        nextRound: nextRound
      };
    } catch (error) {
      console.error(`❌ Error starting countdown for room ${roomCode}:`, error.message);
      throw error;
    }
  }

  // Start server-controlled timer with broadcasts
  startServerTimer(roomCode, io) {
    const game = this.rooms.get(roomCode);
    if (!game || game.roundStatus !== 'active') {
      return;
    }

    const startTime = Date.now();
    console.log(`⏱️ Starting server timer for round ${game.currentRound} in room ${roomCode}`);

    // Broadcast timer updates every second for smooth countdown
    const timerInterval = setInterval(() => {
      const currentGame = this.rooms.get(roomCode);
      if (!currentGame || currentGame.roundStatus !== 'active') {
        clearInterval(timerInterval);
        return;
      }

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const timeRemaining = Math.max(0, this.ROUND_DURATION - elapsed);

      // Broadcast time update every second
      io.to(roomCode).emit('timer-update', {
        timeRemaining,
        roundActive: timeRemaining > 0
      });

      // End round when time expires
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        this.endRoundByTimer(roomCode, io);
      }
    }, 1000); // Update every 1 second for smooth countdown

    // Store timer reference
    if (!this.roomTimers.has(roomCode)) {
      this.roomTimers.set(roomCode, {});
    }
    this.roomTimers.get(roomCode).timerInterval = timerInterval;
  }

  // End round when server timer expires
  endRoundByTimer(roomCode, io) {
    try {
      const game = this.rooms.get(roomCode);
      if (!game || game.roundStatus !== 'active') {
        return;
      }

      console.log(`⏰ Server timer expired for round ${game.currentRound} in room ${roomCode} - requesting client results`);
      
      // Signal clients that time is up and they should submit results immediately
      io.to(roomCode).emit('round-time-expired', {
        message: 'Time expired - submit your results now!'
      });

      // Wait briefly for client submissions, then force end if needed
      setTimeout(() => {
        const updatedGame = this.rooms.get(roomCode);
        if (updatedGame && updatedGame.roundStatus === 'active') {
          console.log(`⏰ Force ending round ${updatedGame.currentRound} in room ${roomCode} - processing available results`);
          
          const roundResult = gameLogic.endRound(updatedGame);
          
          // Clear timers
          this.clearRoundTimer(roomCode);
          
          // Send results
          if (updatedGame.gameStatus === 'finished') {
            io.to(roomCode).emit('game-finished', {
              roundResult,
              gameState: gameLogic.getGameState(updatedGame),
              finalResults: updatedGame.finalResults
            });
          } else {
            io.to(roomCode).emit('round-ended', {
              roundResult,
              gameState: gameLogic.getGameState(updatedGame)
            });
          }
        }
      }, 2000); // Wait 2 seconds for client submissions

    } catch (error) {
      console.error(`❌ Error ending round by timer for room ${roomCode}:`, error.message);
    }
  }

  // Clear round timer for a room
  clearRoundTimer(roomCode) {
    const timers = this.roomTimers.get(roomCode);
    if (timers) {
      if (timers.timerInterval) {
        clearInterval(timers.timerInterval);
        delete timers.timerInterval;
      }
      if (timers.countdownTimer) {
        clearTimeout(timers.countdownTimer);
        delete timers.countdownTimer;
      }
    }
  }

  // Schedule room cleanup after all players disconnect
  scheduleRoomCleanup(roomCode, delayMinutes = 5) {
    // Clear any existing cleanup timer
    this.clearCleanupTimer(roomCode);

    const timer = setTimeout(() => {
      this.cleanupRoom(roomCode);
    }, delayMinutes * 60 * 1000);

    if (!this.roomTimers.has(roomCode)) {
      this.roomTimers.set(roomCode, {});
    }
    this.roomTimers.get(roomCode).cleanupTimer = timer;

    console.log(`🧹 Room ${roomCode} scheduled for cleanup in ${delayMinutes} minutes`);
  }

  // Clear cleanup timer for a room
  clearCleanupTimer(roomCode) {
    const timers = this.roomTimers.get(roomCode);
    if (timers && timers.cleanupTimer) {
      clearTimeout(timers.cleanupTimer);
      delete timers.cleanupTimer;
    }
  }

  // Clean up abandoned room
  cleanupRoom(roomCode) {
    const game = this.rooms.get(roomCode);
    if (!game) {
      return;
    }

    // Check if any players reconnected
    const connectedPlayers = Object.values(game.players).filter(p => p.connected);
    if (connectedPlayers.length > 0) {
      console.log(`🔄 Room ${roomCode} cleanup cancelled - players reconnected`);
      this.clearCleanupTimer(roomCode);
      return;
    }

    // Remove room and clean up timers
    this.rooms.delete(roomCode);
    this.roomTimers.delete(roomCode);

    // Remove player room mappings
    Object.keys(game.players).forEach(playerId => {
      this.playerRooms.delete(playerId);
    });

    console.log(`🗑️  Room ${roomCode} cleaned up`);
  }

  // Get the room code for a specific player
  getPlayerRoom(playerId) {
    return this.playerRooms.get(playerId) || null;
  }

  // Get a room object by room code
  getRoom(roomCode) {
    return this.rooms.get(roomCode) || null;
  }

  // Get server statistics
  getStats() {
    const totalRooms = this.rooms.size;
    const activeGames = Array.from(this.rooms.values()).filter(game => 
      game.gameStatus === 'playing' || game.gameStatus === 'between-rounds').length;
    const totalPlayers = this.playerRooms.size;

    return {
      totalRooms,
      activeGames,
      totalPlayers,
      wordDataStats: wordData.getStats()
    };
  }

  // Clean up all timers (for server shutdown)
  cleanup() {
    console.log('🧹 Cleaning up all room timers...');
    
    for (const [roomCode, timers] of this.roomTimers.entries()) {
      if (timers.timerInterval) {
        clearInterval(timers.timerInterval);
      }
      if (timers.countdownTimer) {
        clearTimeout(timers.countdownTimer);
      }
      if (timers.cleanupTimer) {
        clearTimeout(timers.cleanupTimer);
      }
    }
    
    this.roomTimers.clear();
    console.log('✅ All timers cleared');
  }
}

// Create singleton instance
const roomManager = new RoomManager();

module.exports = roomManager;