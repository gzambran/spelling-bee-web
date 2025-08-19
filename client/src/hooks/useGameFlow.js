import { useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socketService';

export function useGameFlow(playerName) {
  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState('lobby');
  
  // Game state
  const [gameState, setGameState] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [roundResults, setRoundResults] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [nextRound, setNextRound] = useState(null);
  const [serverTimeRemaining, setServerTimeRemaining] = useState(null);
  
  // Refs for cleanup
  const countdownTimerRef = useRef(null);

  // Clean up countdown timer
  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // Create room handler
  const handleCreateRoom = useCallback(async () => {
    try {
      const result = await socketService.createRoom(playerName);
      setRoomCode(result.roomCode);
      setGameState(result.game);
      console.log('🏠 Room created successfully:', result.roomCode);
      return result;
    } catch (error) {
      console.error('❌ Failed to create room:', error.message);
      throw error;
    }
  }, [playerName]);

  // Join room handler
  const handleJoinRoom = useCallback(async (code) => {
    try {
      const result = await socketService.joinRoom(code, playerName);
      setRoomCode(code);
      setGameState(result.game);
      console.log('🚪 Joined room successfully:', code);
      return result;
    } catch (error) {
      console.error('❌ Failed to join room:', error.message);
      throw error;
    }
  }, [playerName]);

  // Player ready handler
  const handlePlayerReady = useCallback(async (ready = true) => {
    try {
      const result = await socketService.setPlayerReady(ready);
      console.log('✅ Player ready status updated:', ready);
      return result;
    } catch (error) {
      console.error('❌ Failed to update ready status:', error.message);
      throw error;
    }
  }, []);

  // Submit round results
  const handleSubmitRoundResults = useCallback(async (words, totalScore) => {
    try {
      const result = await socketService.submitRoundResults(words, totalScore);
      console.log('📊 Round results submitted successfully');
      return result;
    } catch (error) {
      console.error('❌ Failed to submit round results:', error.message);
      throw error;
    }
  }, []);

  // Handle next round
  const handleNextRound = useCallback(() => {
    console.log('➡️ Ready for next round');
    handlePlayerReady(true);
  }, [handlePlayerReady]);

  // Show final results
  const handleShowFinalResults = useCallback((data) => {
    console.log('🏆 Showing final results');
    setFinalResults(data.finalResults || data.gameState?.finalResults);
    setCurrentScreen('final-results');
  }, []);

  // Play again handler
  const handlePlayAgain = useCallback(() => {
    console.log('🔄 Play again requested');
    handlePlayerReady(true);
  }, [handlePlayerReady]);

  // Back to lobby handler
  const handleBackToLobby = useCallback(() => {
    console.log('🏠 Returning to lobby');
    clearCountdownTimer();
    setCurrentScreen('lobby');
    setGameState(null);
    setRoomCode('');
    setRoundResults(null);
    setFinalResults(null);
    setCountdown(null);
    setNextRound(null);
    setServerTimeRemaining(null);
  }, [clearCountdownTimer]);

  // Set up socket event listeners
  useEffect(() => {
    // Player joined
    const handlePlayerJoined = (data) => {
      console.log('👤 Player joined:', data.player);
      setGameState(data.gameState);
    };

    // Player ready status
    const handlePlayerReadyStatus = (data) => {
      console.log('🟢 Player ready status update:', data.playerId, data.ready);
      setGameState(data.gameState);
    };

    // Player disconnected
    const handlePlayerDisconnected = (data) => {
      console.log('📴 Player disconnected:', data.playerId);
      // Optionally update game state
    };

    // Countdown started
    const handleCountdownStarted = (data) => {
      console.log('⏰ Countdown started:', data.countdown, 'seconds');
      clearCountdownTimer();
      setCountdown(data.countdown);
      setNextRound(data.nextRound);
      setCurrentScreen('countdown');
      
      // Local countdown timer
      let timeLeft = data.countdown;
      countdownTimerRef.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        
        if (timeLeft <= 0) {
          clearCountdownTimer();
        }
      }, 1000);
    };

    // Round started
    const handleRoundStarted = (data) => {
      console.log('🎯 Round started:', data.roundInfo);
      clearCountdownTimer();
      setGameState(data.gameState);
      setCurrentScreen('game');
      setServerTimeRemaining(data.roundInfo.duration);
    };

    // Timer update from server
    const handleTimerUpdate = (data) => {
      setServerTimeRemaining(data.timeRemaining);
    };

    // Round time expired
    const handleRoundTimeExpired = () => {
      console.log('⏰ Round time expired!');
      setServerTimeRemaining(0);
    };

    // Round ended
    const handleRoundEnded = (data) => {
      console.log('🏁 Round ended');
      setRoundResults(data.roundResult);
      setGameState(data.gameState);
      setCurrentScreen('results');
    };

    // Game finished
    const handleGameFinished = (data) => {
      console.log('🏆 Game finished!');
      setFinalResults(data.finalResults);
      setGameState(data.gameState);
      setCurrentScreen('final-results');
    };

    // Game restarted
    const handleGameRestarted = (data) => {
      console.log('🔄 Game restarted');
      setGameState(data.gameState);
      setRoundResults(null);
      setFinalResults(null);
    };

    // Register event listeners
    socketService.on('player-joined', handlePlayerJoined);
    socketService.on('player-ready-status', handlePlayerReadyStatus);
    socketService.on('player-disconnected', handlePlayerDisconnected);
    socketService.on('countdown-started', handleCountdownStarted);
    socketService.on('round-started', handleRoundStarted);
    socketService.on('timer-update', handleTimerUpdate);
    socketService.on('round-time-expired', handleRoundTimeExpired);
    socketService.on('round-ended', handleRoundEnded);
    socketService.on('game-finished', handleGameFinished);
    socketService.on('game-restarted', handleGameRestarted);

    // Cleanup
    return () => {
      socketService.off('player-joined', handlePlayerJoined);
      socketService.off('player-ready-status', handlePlayerReadyStatus);
      socketService.off('player-disconnected', handlePlayerDisconnected);
      socketService.off('countdown-started', handleCountdownStarted);
      socketService.off('round-started', handleRoundStarted);
      socketService.off('timer-update', handleTimerUpdate);
      socketService.off('round-time-expired', handleRoundTimeExpired);
      socketService.off('round-ended', handleRoundEnded);
      socketService.off('game-finished', handleGameFinished);
      socketService.off('game-restarted', handleGameRestarted);
      clearCountdownTimer();
    };
  }, [clearCountdownTimer]);

  return {
    // State
    currentScreen,
    gameState,
    roomCode,
    roundResults,
    finalResults,
    countdown,
    nextRound,
    serverTimeRemaining,
    
    // Handlers
    handleCreateRoom,
    handleJoinRoom,
    handlePlayerReady,
    handleSubmitRoundResults,
    handleNextRound,
    handleShowFinalResults,
    handlePlayAgain,
    handleBackToLobby
  };
}