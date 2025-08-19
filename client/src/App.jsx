import { useState, useRef, useEffect } from 'react';
import './css/App.css';

// Import screens
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import ResultsScreen from './screens/ResultsScreen';
import FinalResultsScreen from './screens/FinalResultsScreen';
import CountdownScreen from './screens/CountdownScreen';

// Import hooks
import { useGameFlow } from './hooks/useGameFlow';

// Import socket service
import socketService from './services/socketService';

export default function App() {
  // Animation state (simplified for web)
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Simple name-based "auth" for web
  const [playerName, setPlayerName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);

  // Game state and handlers
  const {
    currentScreen,
    gameState,
    roomCode,
    roundResults,
    finalResults,
    countdown,
    nextRound,
    serverTimeRemaining,
    handleCreateRoom,
    handleJoinRoom,
    handlePlayerReady,
    handleSubmitRoundResults,
    handleNextRound,
    handleShowFinalResults,
    handlePlayAgain,
    handleBackToLobby
  } = useGameFlow(playerName);

  // Handle initial name entry
  const handleNameSubmit = (name) => {
    if (name.trim()) {
      setPlayerName(name.trim());
      setIsNameSet(true);
      
      // Connect socket when name is set
      socketService.connect();
    }
  };

  // Handle back to lobby with animation
  const handleBackToLobbyMain = () => {
    setIsAnimating(true);
    setTimeout(() => {
      handleBackToLobby();
      setIsAnimating(false);
    }, 300);
  };

  // Simple name entry screen
  if (!isNameSet) {
    return (
      <div className="app-container">
        <div className="name-entry-screen">
          <h1>Spelling Bee Duel</h1>
          <p>Enter your name to start playing</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const input = e.target.elements.playerName;
            handleNameSubmit(input.value);
          }}>
            <input
              type="text"
              name="playerName"
              placeholder="Your name"
              maxLength={20}
              autoFocus
              required
            />
            <button type="submit">Start Playing</button>
          </form>
        </div>
      </div>
    );
  }

  // Render current game screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'lobby':
        return (
          <LobbyScreen
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onPlayerReady={handlePlayerReady}
            onBackToLobby={handleBackToLobby}
            gameState={gameState}
            roomCode={roomCode}
            playerName={playerName}
          />
        );
      
      case 'countdown':
        return (
          <CountdownScreen
            countdown={countdown}
            nextRound={nextRound}
          />
        );
      
      case 'game':
        return (
          <GameScreen
            gameState={gameState}
            onSubmitRoundResults={handleSubmitRoundResults}
            playerName={playerName}
            timeRemaining={serverTimeRemaining}
          />
        );
      
      case 'results':
        return (
          <ResultsScreen
            roundResult={roundResults}
            gameState={gameState}
            onPlayerReady={handleNextRound}
            onShowFinalResults={() => {
              if (gameState?.finalResults) {
                handleShowFinalResults({
                  gameState: gameState,
                  finalResults: gameState.finalResults
                });
              }
            }}
            playerName={playerName}
          />
        );
      
      case 'final-results':
        return (
          <FinalResultsScreen
            finalResults={finalResults}
            gameState={gameState}
            onPlayAgain={handlePlayAgain}
            onBackToLobby={handleBackToLobbyMain}
            playerName={playerName}
          />
        );
      
      default:
        return (
          <LobbyScreen
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onPlayerReady={handlePlayerReady}
            onBackToLobby={handleBackToLobby}
            gameState={gameState}
            roomCode={roomCode}
            playerName={playerName}
          />
        );
    }
  };

  return (
    <div className={`app-container ${isAnimating ? 'animating' : ''}`}>
      {renderCurrentScreen()}
    </div>
  );
}