import { useEffect, useState } from 'react';
import '../css/FinalResultsScreen.css';

const FinalResultsScreen = ({ 
  finalResults, 
  gameState, 
  onPlayAgain, 
  onBackToLobby, 
  playerName 
}) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [hasClickedPlayAgain, setHasClickedPlayAgain] = useState(false);

  // Get player data
  const currentPlayer = gameState?.players.find(p => p.name === playerName);
  const allPlayers = gameState?.players || [];

  // Hide confetti after animation
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // Reset ready state when gameState changes (new game starting)
  useEffect(() => {
    if (gameState) {
      // Check if current player is ready (has clicked Play Again)
      const currentPlayerData = gameState.players.find(p => p.name === playerName);
      setHasClickedPlayAgain(currentPlayerData?.ready || false);
    }
  }, [gameState, playerName]);

  // Handle play again with status tracking
  const handlePlayAgainClick = () => {
    if (!hasClickedPlayAgain) {
      setHasClickedPlayAgain(true);
      onPlayAgain();
    }
  };

  // Fixed getRoundBreakdown function to properly access round data
  const getRoundBreakdown = (playerName) => {
    if (!gameState?.roundResults) return [];
    
    return gameState.roundResults.map((round) => {
      // Find the player data in the round's players object
      const playerData = round.players ? 
        Object.values(round.players).find(p => p.name === playerName) : null;
      
      return {
        round: round.round,
        points: playerData?.roundScore || 0,
        words: playerData?.wordCount || 0
      };
    });
  };

  // Helper function to get rank badge/number
  const getRankDisplay = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}`;
    }
  };

  if (!finalResults || !gameState || !currentPlayer) {
    return (
      <div className="final-results-container">
        <div className="final-results-card">
          <p className="loading-text">Loading final results...</p>
        </div>
      </div>
    );
  }

  const isWinner = finalResults.winner?.name === playerName;
  const isTie = finalResults.isTie;
  const playerBreakdown = getRoundBreakdown(playerName);
  
  // Calculate total words for current player
  const playerFinalScore = finalResults.finalScores?.find(p => p.name === playerName);
  const totalWords = playerFinalScore?.totalWords || 
    playerBreakdown.reduce((sum, round) => sum + round.words, 0);

  // Calculate ready status for play again
  const readyPlayers = allPlayers.filter(p => p.ready);
  const allReady = allPlayers.length >= 2 && allPlayers.every(p => p.ready);

  return (
    <div className="final-results-container">
      {/* Confetti overlay for winner */}
      {showConfetti && (isWinner || isTie) && (
        <div className="confetti-overlay">
          🎊 🎉 🎊 🎉 🎊 🎉 🎊 🎉
        </div>
      )}

      <div className="final-results-card">
        {/* Winner/Result Announcement */}
        <div className="winner-section">
          {isTie ? (
            <>
              <h1 className="tie-title">🏆 It's a Tie! 🏆</h1>
              <div className="winners-list">
                {finalResults.winners?.map(winner => (
                  <span key={winner.name} className="winner-name">
                    {winner.name}
                  </span>
                ))}
              </div>
              <p className="winner-score">Final Score: {currentPlayer.totalScore} pts</p>
            </>
          ) : isWinner ? (
            <>
              <h1 className="winner-title">🏆 You Won!</h1>
              <p className="winner-score">Final Score: {currentPlayer.totalScore} pts</p>
            </>
          ) : (
            <>
              <h1 className="winner-title">🏆 {finalResults.winner.name} Won!</h1>
              <p className="winner-score">Your Score: {currentPlayer.totalScore} pts</p>
            </>
          )}
        </div>

        {/* Final Standings - Show all players when multiplayer */}
        {allPlayers.length > 1 && finalResults.finalScores && (
          <div className="standings-section">
            <h2>Final Standings</h2>
            <div className="standings-list">
              {finalResults.finalScores.map((player, index) => (
                <div 
                  key={player.name}
                  className={`standing-row ${player.name === playerName ? 'current-player' : ''} ${index === 0 ? 'winner' : ''}`}
                >
                  <span className="rank-badge">
                    {getRankDisplay(index)}
                  </span>
                  <span className="player-name">{player.name}</span>
                  <span className="total-score">{player.totalScore} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Performance Breakdown */}
        <div className="breakdown-section">
          <h3>Your Performance</h3>
          <div className="rounds-breakdown">
            {playerBreakdown.map((roundData, index) => (
              <div key={index} className="round-stat">
                <span className="round-label">Round {roundData.round}</span>
                <span className="round-score">
                  {roundData.points} pts
                </span>
                <span className="round-words">
                  ({roundData.words} words)
                </span>
              </div>
            ))}
            <div className="total-stat">
              <span className="total-label">Total</span>
              <span className="total-value">{currentPlayer.totalScore} pts</span>
            </div>
          </div>
        </div>

        {/* Play Again Ready Status Section - Similar to lobby */}
        {allPlayers.length > 1 && (
          <div className="play-again-section">
            <h3>Play Again?</h3>
            <div className="players-ready-list">
              {allPlayers.map((player, index) => (
                <div key={player.id || index} className={`player-ready-item ${player.name === playerName ? 'current-player' : ''}`}>
                  <span className="player-name">{player.name}</span>
                  {player.ready && (
                    <span className="ready-badge">Ready</span>
                  )}
                </div>
              ))}
            </div>
            
            {readyPlayers.length > 0 && !allReady && (
              <p className="ready-status">
                {readyPlayers.length}/{allPlayers.length} players ready
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          {!hasClickedPlayAgain ? (
            <button
              className="play-again-button"
              onClick={handlePlayAgainClick}
              disabled={allPlayers.length < 2}
            >
              {allPlayers.length < 2 ? 'Waiting for players...' : 'Play Again'}
            </button>
          ) : (
            <div className="waiting-message">
              {allReady ? 'Starting new game...' : 'Waiting for other players...'}
            </div>
          )}
          
          <button
            className="back-lobby-button"
            onClick={onBackToLobby}
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalResultsScreen;