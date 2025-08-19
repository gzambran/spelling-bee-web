import React, { useCallback } from 'react';
import '../css/GameHeader.css';

const GameHeader = ({ gameState, timeRemaining, currentScore }) => {
  // Format time display
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get timer color class based on remaining time
  const getTimerColorClass = useCallback(() => {
    if (timeRemaining > 30) return 'timer-safe';
    if (timeRemaining > 10) return 'timer-warning';
    return 'timer-danger';
  }, [timeRemaining]);

  return (
    <header className="game-header">
      <div className="round-info">
        <span className="round-text">
          Round {gameState.currentRound}/{gameState.totalRounds}
        </span>
      </div>
      
      <div className={`timer ${getTimerColorClass()}`}>
        <span className="timer-text">
          {formatTime(timeRemaining)}
        </span>
      </div>
      
      <div className="score-info">
        <span className="score-label">Score</span>
        <span className="score-value">{currentScore}</span>
      </div>
    </header>
  );
};

export default GameHeader;