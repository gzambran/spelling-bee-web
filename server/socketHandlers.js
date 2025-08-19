const roomManager = require('./roomManager');
const gameLogic = require('./gameLogic');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Player connected: ${socket.id}`);

    socket.on('create-room', (data, callback) => {
      try {
        const { playerName } = data;
        console.log(`🏠 Room creation attempt by ${playerName} (socket: ${socket.id})`);
        
        const result = roomManager.createRoom(socket.id, playerName);
        
        socket.join(result.roomCode);
        console.log(`🏠 ${playerName} joined Socket.io room ${result.roomCode}`);
        
        callback({ success: true, ...result });
        
        socket.to(result.roomCode).emit('player-joined', {
          player: result.game.players.find(p => p.id === socket.id),
          gameState: result.game
        });
        
      } catch (error) {
        console.error('❌ Create room error:', error.message);
        callback({ success: false, error: error.message });
      }
    });

    socket.on('join-room', (data, callback) => {
      try {
        const { roomCode, playerName } = data;
        console.log(`🚪 Room join attempt by ${playerName} for room ${roomCode} (socket: ${socket.id})`);
        
        const result = roomManager.joinRoom(roomCode, socket.id, playerName);
        
        socket.join(roomCode);
        console.log(`🚪 ${playerName} joined Socket.io room ${roomCode}`);
        
        callback({ success: true, ...result });
        
        socket.to(roomCode).emit('player-joined', {
          player: result.game.players.find(p => p.id === socket.id),
          gameState: result.game
        });
        
      } catch (error) {
        console.error('❌ Join room error:', error.message);
        callback({ success: false, error: error.message });
      }
    });

    // Handle player ready status
    socket.on('player-ready', (data, callback) => {
      try {
        const roomCode = roomManager.getPlayerRoom(socket.id);
        if (!roomCode) {
          throw new Error('Player not in any room');
        }

        const game = roomManager.getRoom(roomCode);
        
        // Set player ready status
        const canStartNext = gameLogic.setPlayerReady(game, socket.id, data.ready);
        
        console.log(`🟢 Player ready status: ${game.players[socket.id]?.name} = ${data.ready} (game status: ${game.gameStatus})`);
        
        // Always emit player ready status
        io.to(roomCode).emit('player-ready-status', {
          playerId: socket.id,
          ready: data.ready,
          gameState: gameLogic.getGameState(game)
        });

        // Check for game state transitions
        if (gameLogic.canRestartGame(game)) {
          console.log(`🔄 Restarting game in room ${roomCode} - both players clicked Play Again`);
          gameLogic.restartGame(game);
          
          io.to(roomCode).emit('game-restarted', {
            gameState: gameLogic.getGameState(game)
          });
          
          // Start the new game
          roomManager.startRoundWithTimer(roomCode, io);
          
        } else if (gameLogic.canStartGame(game)) {
          console.log(`🎯 Starting countdown for first game in room ${roomCode}`);
          roomManager.startRoundWithTimer(roomCode, io);
        } else if (canStartNext) {
          console.log(`🎯 Starting countdown for next round in room ${roomCode}`);
          roomManager.startRoundWithTimer(roomCode, io);
        }

        callback({ success: true, canStartNext });
        
      } catch (error) {
        console.error('Player ready error:', error.message);
        callback({ success: false, error: error.message });
      }
    });

    // Handle round results submission
    socket.on('submit-round-results', async (data, callback) => {
      try {
        const { words, totalScore } = data;
        const roomCode = roomManager.getPlayerRoom(socket.id);
        
        if (!roomCode) {
          throw new Error('Player not in any room');
        }

        const game = roomManager.getRoom(roomCode);
        const result = gameLogic.processRoundResults(game, socket.id, { words, totalScore });
        
        callback({ success: true, ...result });
        
        console.log(`📊 Results submitted by player in room ${roomCode}`);
        
        const playersWithResults = Object.values(game.players).filter(p => p.hasSubmittedResults === true);
        const totalPlayers = Object.keys(game.players).length;

        if (playersWithResults.length === totalPlayers && game.roundStatus === 'active') {
          console.log(`🎯 All players submitted results - ending round ${game.currentRound} in room ${roomCode}`);
          const roundResult = await gameLogic.endRound(game);
          roomManager.clearRoundTimer(roomCode);
          
          const roundResultsData = {
            roundResult,
            gameState: gameLogic.getGameState(game)
          };

          io.to(roomCode).emit('round-ended', roundResultsData);

          // Check if game is finished after this round
          if (game.gameStatus === 'finished') {
            console.log(`🏆 Game finished in room ${roomCode}, preparing final results...`);
          }
        }
        
      } catch (error) {
        console.error('Submit round results error:', error.message);
        callback({ success: false, error: error.message });
      }
    });

    // Handle player disconnection
    socket.on('disconnect', (reason) => {
      console.log(`📴 Player disconnected: ${socket.id}, reason: ${reason}`);
      
      try {
        const leaveResult = roomManager.leaveRoom(socket.id);
        
        if (leaveResult) {
          socket.to(leaveResult.roomCode).emit('player-disconnected', {
            playerId: socket.id,
            remainingPlayers: leaveResult.remainingPlayers
          });
        }
      } catch (error) {
        console.error('Error handling disconnect:', error.message);
      }
    });

    // Basic ping-pong for connection testing
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle reconnection attempts
    socket.on('reconnect-to-room', (data, callback) => {
      try {
        const { roomCode, playerName } = data;
        const result = roomManager.rejoinRoom(roomCode, socket.id, playerName);
        
        socket.join(roomCode);
        
        callback({ success: true, ...result });
        
        socket.to(roomCode).emit('player-reconnected', {
          playerId: socket.id,
          playerName,
          gameState: result.game
        });
        
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });
  });
}

module.exports = {
  setupSocketHandlers
};