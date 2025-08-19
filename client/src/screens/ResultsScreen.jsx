import React, { useState, useEffect } from 'react';
import '../css/ResultsScreen.css';
import socketService from '../services/socketService';
import WordsComparison from '../components/WordsComparison';

const ResultsScreen = ({ 
  roundResult, 
  gameState, 
  onPlayerReady, 
  onShowFinalResults,
  playerName 
}) => {
  const [isReady, setIsReady] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Get current player socket ID
  const getCurrentPlayerSocketId = () => {
    return socketService.socket?.id;
  };

  // Get all players data from round results
  const getAllPlayersData = () => {
    if (!roundResult?.players) {
      return [];
    }

    const currentPlayerSocketId = getCurrentPlayerSocketId();
    const playersData = Object.entries(roundResult.players).map(([socketId, playerData]) => ({
      ...playerData,
      socketId,
      isCurrentPlayer: socketId === currentPlayerSocketId
    }));

    // Sort by score (descending) for ranking display
    return playersData.sort((a, b) => b.roundScore - a.roundScore);
  };

  const allPlayersData = getAllPlayersData();
  const currentPlayerData = allPlayersData.find(p => p.isCurrentPlayer);

  // Get ready status for all players
  const getPlayersReadyStatus = () => {
    if (!gameState?.players) return [];
    
    return gameState.players.map(player => ({
      ...player,
      isCurrentPlayer: player.name === playerName
    }));
  };

  const playersReadyStatus = getPlayersReadyStatus();
  const readyPlayers = playersReadyStatus.filter(p => p.ready);
  const totalPlayers = playersReadyStatus.length;

  // Handle ready status changes from other players
  useEffect(() => {
    const newlyReadyPlayers = playersReadyStatus.filter(p => 
      p.ready && !p.isCurrentPlayer && p.name !== playerName
    );

    if (newlyReadyPlayers.length > 0 && !isReady && !showToast) {
      setShowToast(true);
      
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [playersReadyStatus, isReady, showToast, playerName]);

  const handleReady = async () => {
    try {
      setIsReady(true);
      await socketService.setPlayerReady(true);
      if (onPlayerReady) {
        onPlayerReady();
      }
    } catch (error) {
      console.error('Error setting player ready:', error);
      setIsReady(false);
    }
  };

  // Loading state
  if (!roundResult || !gameState || !currentPlayerData || allPlayersData.length === 0) {
    return (
      <div className="results-container">
        <div className="results-loading">
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  const isLastRound = gameState.currentRound >= gameState.totalRounds;
  const buttonText = isLastRound 
    ? 'Continue to Final Results' 
    : `Ready for Round ${gameState.currentRound + 1}`;

  const handleButtonPress = () => {
    if (isLastRound) {
      if (onShowFinalResults) {
        onShowFinalResults();
      }
    } else {
      handleReady();
    }
  };

  // Get rank suffix (1st, 2nd, 3rd, etc.)
  const getRankSuffix = (rank) => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  };

  // Get player's rank in this round
  const currentPlayerRank = allPlayersData.findIndex(p => p.isCurrentPlayer) + 1;
  const isRoundWinner = currentPlayerRank === 1;
  const highScore = allPlayersData[0]?.roundScore || 0;
  const isRoundTie = allPlayersData.filter(p => p.roundScore === highScore).length > 1;

  return (
    <div className="results-container">
      {/* Floating Toast for Other Players Ready */}
      {showToast && readyPlayers.length > 0 && (
        <div className="players-ready-toast">
          <span>
            {readyPlayers.length === 1 
              ? `${readyPlayers[0].name} is ready!`
              : `${readyPlayers.length} players are ready!`
            }
          </span>
        </div>
      )}

      <div className="results-content">
        {/* Header */}
        <header className="results-header">
          <h1 className="results-title">
            Round {roundResult.round} Results
          </h1>

          {/* Current Player Summary */}
          <div className="current-player-summary card">
            <div className="player-rank">
              {isRoundTie && currentPlayerRank === 1 ? (
                <span className="tie-rank">🤝 Tied for 1st</span>
              ) : (
                <span className={`rank-display ${isRoundWinner ? 'winner-rank' : ''}`}>
                  {getRankSuffix(currentPlayerRank)} Place
                  {isRoundWinner && !isRoundTie && <span className="crown">👑</span>}
                </span>
              )}
            </div>
            <div className="player-score">
              <span className="score-value">{currentPlayerData.roundScore}</span>
              <span className="score-label">points</span>
            </div>
          </div>
        </header>

        {/* Leaderboard */}
        <div className="leaderboard-section">
          <h3>Round {roundResult.round} Leaderboard</h3>
          <div className="leaderboard card">
            {allPlayersData.map((player, index) => (
              <div 
                key={player.socketId} 
                className={`leaderboard-row ${player.isCurrentPlayer ? 'current-player' : ''} ${index === 0 ? 'winner' : ''}`}
              >
                <span className="rank-badge">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                </span>
                <span className="player-name">
                  {player.name}
                  {player.isCurrentPlayer && <span className="you-indicator"> (You)</span>}
                </span>
                <div className="player-stats">
                  <span className="round-score">{player.roundScore} pts</span>
                  <span className="word-count">({player.wordCount} words)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Word Lists */}
        <div className="words-section">
          <WordsComparison
            allPlayersData={allPlayersData}
            currentPlayerSocketId={getCurrentPlayerSocketId()}
          />
        </div>

        {/* Ready Status */}
        {totalPlayers > 1 && (
          <div className="ready-status-section">
            <h3>Ready Status</h3>
            <div className="players-ready-list card">
              {playersReadyStatus.map((player, index) => (
                <div 
                  key={player.id || index} 
                  className={`player-ready-item ${player.isCurrentPlayer ? 'current-player' : ''}`}
                >
                  <span className="player-name">
                    {player.name}
                    {player.isCurrentPlayer && <span className="you-indicator"> (You)</span>}
                  </span>
                  {player.ready && (
                    <span className="ready-badge">✓ Ready</span>
                  )}
                </div>
              ))}
            </div>
            
            {readyPlayers.length > 0 && readyPlayers.length < totalPlayers && (
              <p className="ready-count">
                {readyPlayers.length}/{totalPlayers} players ready
              </p>
            )}
          </div>
        )}

        {/* Ready Button */}
        <div className="ready-section">
          <button
            className={`ready-button ${isReady ? 'ready-button-pressed' : ''}`}
            onClick={handleButtonPress}
            disabled={isReady}
          >
            <span className="ready-button-text">
              {isReady 
                ? (readyPlayers.length < totalPlayers 
                    ? `Waiting for ${totalPlayers - readyPlayers.length} more players...` 
                    : 'Starting next round...')
                : buttonText
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsScreen;