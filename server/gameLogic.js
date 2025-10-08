const wordData = require('./wordData');

class GameLogic {
  constructor() {
    this.ROUND_DURATION = 90; // 90 seconds per round
    this.TOTAL_ROUNDS = 3;
    this.MIN_WORD_LENGTH = 4;
    this.MIN_PLAYERS = 2;
    this.MAX_PLAYERS = 8;
  }

  // Calculate points for a word based on length
  calculateWordPoints(word) {
    const length = word.length;
    if (length < this.MIN_WORD_LENGTH) {
      return 0;
    }
    
    // Exponential scoring: length² points
    return length * length;
  }

  // Calculate total points including pangram bonus
  calculateTotalPoints(word, isPangram) {
    const basePoints = this.calculateWordPoints(word);
    const pangramBonus = isPangram ? 25 : 0;
    return basePoints + pangramBonus;
  }

  // Create a new game state
  createGame(roomCode, initialPuzzle) {
    return {
      roomCode,
      puzzle: initialPuzzle, // Current round's puzzle
      puzzles: [initialPuzzle], // Store all puzzles used
      currentRound: 0,
      totalRounds: this.TOTAL_ROUNDS,
      gameStatus: 'waiting', // waiting, playing, between-rounds, finished
      roundStatus: 'waiting', // waiting, active, ended
      roundStartTime: null,
      roundEndTime: null,
      players: {},
      roundResults: [],
      finalResults: null,
      createdAt: new Date().toISOString()
    };
  }

  // Add a player to the game
  addPlayer(game, playerId, playerName) {
    if (Object.keys(game.players).length >= this.MAX_PLAYERS) {
      throw new Error('Game is full');
    }

    game.players[playerId] = {
      id: playerId,
      name: playerName || `Player ${Object.keys(game.players).length + 1}`,
      words: [],
      roundScore: 0,
      totalScore: 0,
      ready: false,
      connected: true,
      joinedAt: new Date().toISOString()
    };

    console.log(`🎮 Player ${playerName} joined game ${game.roomCode}`);
    return game.players[playerId];
  }

  // Remove a player from the game
  removePlayer(game, playerId) {
    if (game.players[playerId]) {
      console.log(`🚪 Player ${game.players[playerId].name} left game ${game.roomCode}`);
      delete game.players[playerId];
    }
  }

  // Check if all players are ready to start
  canStartGame(game) {
    const playerCount = Object.keys(game.players).length;
    const allReady = Object.values(game.players).every(p => p.ready && p.connected);
    
    return playerCount >= this.MIN_PLAYERS && allReady && game.gameStatus === 'waiting';
  }

  // Start a new round with a fresh puzzle
  startRound(game) {
    if (game.currentRound >= this.TOTAL_ROUNDS) {
      throw new Error('All rounds completed');
    }

    game.currentRound++;
    
    // Get a new puzzle for this round (except for the first round which already has one)
    if (game.currentRound > 1) {
      const newPuzzle = wordData.getRandomPuzzle();
      game.puzzle = newPuzzle;
      game.puzzles.push(newPuzzle);
    }
    
    // Log puzzle info with filename for debugging
    console.log(`🎲 Round ${game.currentRound} puzzle: ${game.puzzle.centerLetter}/${game.puzzle.outerLetters.join('')} - ${game.puzzle.filename || 'unknown'} (${game.puzzle.puzzleDate || 'no date'})`);
    
    game.gameStatus = 'playing';
    game.roundStatus = 'active';
    game.roundStartTime = new Date().toISOString();
    game.roundEndTime = new Date(Date.now() + this.ROUND_DURATION * 1000).toISOString();

    // Reset player round data
    Object.values(game.players).forEach(player => {
      player.words = [];
      player.roundScore = 0;
      player.ready = false;
      player.hasSubmittedResults = false;
    });

    console.log(`🎯 Round ${game.currentRound}/${this.TOTAL_ROUNDS} started for game ${game.roomCode}`);
    
    return {
      round: game.currentRound,
      totalRounds: this.TOTAL_ROUNDS,
      duration: this.ROUND_DURATION,
      startTime: game.roundStartTime,
      endTime: game.roundEndTime,
      puzzle: game.puzzle
    };
  }

  // Process round results submitted by client
  processRoundResults(game, playerId, results) {
    const player = game.players[playerId];
    if (!player) {
      throw new Error('Player not found');
    }

    if (game.roundStatus !== 'active') {
      console.warn(`⚠️ Player ${player.name} submitted results but round status is ${game.roundStatus}`);
    }

    console.log(`📊 Processing round results for ${player.name}: ${results.words.length} words, ${results.totalScore} points`);

    // Trust the client results as specified in requirements  
    player.words = results.words.map(wordData => ({
      word: wordData.word.toLowerCase(),
      points: wordData.points,
      isPangram: wordData.isPangram,
      submittedAt: new Date().toISOString()
    }));
    
    player.roundScore = results.totalScore;
    player.hasSubmittedResults = true;
    
    console.log(`✅ ${player.name} submitted ${player.words.length} words for ${player.roundScore} points`);
    
    return {
      success: true,
      wordsAccepted: player.words.length,
      roundScore: player.roundScore
    };
  }

  // End the current round
  endRound(game) {
    console.log(`\n🔍 === ENDING ROUND ${game.currentRound} ===`);
    console.log(`🎮 Game: ${game.roomCode}`);

    if (game.roundStatus === 'ended') {
      console.warn(`⚠️ Round ${game.currentRound} already ended`);
      return this.getRoundResults(game, game.currentRound);
    }

    game.roundStatus = 'ended';
    game.roundEndTime = new Date().toISOString();

    // Calculate final round scores
    Object.values(game.players).forEach(player => {
      player.totalScore += player.roundScore;
      console.log(`📊 ${player.name}: Round ${player.roundScore}, Total ${player.totalScore}`);
    });

    // Create round results
    const roundResult = {
      round: game.currentRound,
      endedAt: game.roundEndTime,
      puzzle: game.puzzle,
      players: {}
    };

    Object.values(game.players).forEach(player => {
      roundResult.players[player.id] = {
        name: player.name,
        words: [...player.words],
        roundScore: player.roundScore,
        totalScore: player.totalScore,
        wordCount: player.words.length
      };
    });

    game.roundResults.push(roundResult);

    // Check if game is finished
    if (game.currentRound >= this.TOTAL_ROUNDS) {
      console.log(`🏁 All rounds complete, finishing game...`);
      this.finishGame(game);
    } else {
      game.gameStatus = 'between-rounds';
      console.log(`⏸️ Moving to between-rounds state`);
    }

    console.log(`🏁 Round ${game.currentRound} ended for game ${game.roomCode}`);
    
    return roundResult;
  }

  // Finish the game and determine winner
  finishGame(game) {
    console.log(`\n🔍 === FINISHING GAME ===`);
    console.log(`🎮 Game ID: ${game.roomCode}`);

    game.gameStatus = 'finished';
    
    // Determine winner - sort all players by score
    const playerScores = Object.values(game.players).map(player => ({
      id: player.id,
      name: player.name,
      totalScore: player.totalScore,
      totalWords: game.roundResults.reduce((sum, round) => 
        sum + (round.players[player.id]?.wordCount || 0), 0)
    })).sort((a, b) => b.totalScore - a.totalScore);

    console.log(`🏆 Final scores:`);
    playerScores.forEach((player, index) => {
      console.log(`   ${index + 1}. ${player.name}: ${player.totalScore} points`);
    });

    const winner = playerScores[0];
    const isTie = playerScores.length > 1 && 
                  playerScores.filter(p => p.totalScore === winner.totalScore).length > 1;

    console.log(`🎯 Winner: ${isTie ? 'TIE' : winner.name}`);

    game.finalResults = {
      winner: isTie ? null : winner,
      isTie,
      finalScores: playerScores,
      puzzlesUsed: game.puzzles,
      finishedAt: new Date().toISOString()
    };

    console.log(`🏆 Game ${game.roomCode} finished! Winner: ${isTie ? 'TIE' : winner.name} (${winner.totalScore} pts)`);
    
    return game.finalResults;
  }

  // Mark player as ready for next round
  setPlayerReady(game, playerId, ready = true) {
    const player = game.players[playerId];
    if (!player) {
      throw new Error('Player not found');
    }

    player.ready = ready;
    
    return this.canStartNextRound(game);
  }

  // Check if ready to start next round
  canStartNextRound(game) {
    if (game.gameStatus !== 'between-rounds') {
      return false;
    }

    const allReady = Object.values(game.players).every(p => p.ready && p.connected);
    return allReady;
  }

  // Check if ready to restart a finished game
  canRestartGame(game) {
    if (game.gameStatus !== 'finished') {
      return false;
    }

    const playerCount = Object.keys(game.players).length;
    const allReady = Object.values(game.players).every(p => p.ready && p.connected);
    
    return playerCount >= this.MIN_PLAYERS && allReady;
  }

  // Restart a finished game with same players
  restartGame(game) {
    if (game.gameStatus !== 'finished') {
      throw new Error('Can only restart a finished game');
    }

    console.log(`🔄 Restarting game ${game.roomCode} with same players`);

    // Get a new puzzle for the fresh game
    const newPuzzle = wordData.getRandomPuzzle();
    
    // Reset game state while keeping players
    game.puzzle = newPuzzle;
    game.puzzles = [newPuzzle];
    game.currentRound = 0;
    game.gameStatus = 'waiting';
    game.roundStatus = 'waiting';
    game.roundStartTime = null;
    game.roundEndTime = null;
    game.roundResults = [];
    game.finalResults = null;

    // Reset all players' game data but keep their identities
    Object.values(game.players).forEach(player => {
      player.words = [];
      player.roundScore = 0;
      player.totalScore = 0;
      player.ready = false;
      player.hasSubmittedResults = false;
    });

    console.log(`✅ Game ${game.roomCode} restarted with puzzle: ${game.puzzle.centerLetter}/${game.puzzle.outerLetters.join('')}`);
    
    return game;
  }

  // Get current game state summary
  getGameState(game) {
    const state = {
      roomCode: game.roomCode,
      gameStatus: game.gameStatus,
      roundStatus: game.roundStatus,
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      puzzle: {
        centerLetter: game.puzzle.centerLetter,
        outerLetters: game.puzzle.outerLetters,
        validWords: game.puzzle.validWords,
        pangrams: game.puzzle.pangrams,
        wordPoints: game.puzzle.wordPoints,
        totalWords: game.puzzle.totalWords,
        totalPangrams: game.puzzle.totalPangrams
      },
      players: Object.values(game.players).map(p => ({
        id: p.id,
        name: p.name,
        roundScore: p.roundScore,
        totalScore: p.totalScore,
        wordCount: p.words.length,
        ready: p.ready,
        connected: p.connected
      })),
      roundStartTime: game.roundStartTime,
      roundEndTime: game.roundEndTime,
      timeRemaining: game.roundEndTime ? 
        Math.max(0, Math.floor((new Date(game.roundEndTime) - new Date()) / 1000)) : null,
      roundResults: game.roundResults || []
    };

    // Include final results if game is finished
    if (game.gameStatus === 'finished' && game.finalResults) {
      state.finalResults = game.finalResults;
    }

    return state;
  }

  // Get detailed round results
  getRoundResults(game, roundNumber = null) {
    if (roundNumber !== null) {
      return game.roundResults.find(r => r.round === roundNumber);
    }
    return game.roundResults;
  }
}

// Create singleton instance
const gameLogic = new GameLogic();

module.exports = gameLogic;