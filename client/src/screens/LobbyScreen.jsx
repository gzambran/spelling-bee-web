import { useState } from 'react';
import '../css/LobbyScreen.css';

const LobbyScreen = ({
  onCreateRoom,
  onJoinRoom,
  onPlayerReady,
  onBackToLobby,
  gameState,
  roomCode,
  playerName,
}) => {
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  // Handle create game
  const handleCreateGame = async () => {
    setIsCreating(true);
    setError('');
    try {
      await onCreateRoom();
    } catch (err) {
      setError(err.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle join game
  const handleJoinGame = async () => {
    if (!inputRoomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    setIsJoining(true);
    setError('');
    try {
      await onJoinRoom(inputRoomCode.toUpperCase());
    } catch (err) {
      setError(err.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  // If in a game, show waiting room
  if (gameState && roomCode) {
    const players = gameState.players || [];
    const allReady = players.every(p => p.ready);
    const currentPlayer = players.find(p => p.name === playerName);
    const isReady = currentPlayer?.ready || false;

    return (
      <div className="lobby-container">
        <div className="waiting-room">
          <h2>Waiting Room</h2>
          <div className="room-code-display">
            <span className="room-code-label">Room Code:</span>
            <span className="room-code">{roomCode}</span>
          </div>

          <div className="players-list">
            <h3>Players ({players.length}/8)</h3>
            {players.map((player) => (
              <div key={player.id} className="player-item">
                <span className="player-name">
                  {player.name}
                  {player.name === playerName && ' (You)'}
                </span>
                <span className={`player-status ${player.ready ? 'ready' : 'not-ready'}`}>
                  {player.ready ? '✓ Ready' : 'Not Ready'}
                </span>
              </div>
            ))}
          </div>

          <div className="waiting-actions">
            {!isReady ? (
              <button 
                className="btn btn-primary"
                onClick={() => onPlayerReady(true)}
              >
                Ready to Start
              </button>
            ) : (
              <button 
                className="btn btn-secondary"
                onClick={() => onPlayerReady(false)}
              >
                Not Ready
              </button>
            )}
            
            <button 
              className="btn btn-outline"
              onClick={onBackToLobby}
            >
              Leave Room
            </button>
          </div>

          {allReady && players.length >= 2 && (
            <div className="starting-message">
              Game starting soon...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main lobby screen
  return (
    <div className="lobby-container">
      <div className="lobby-content">
        <div className="welcome-card">
          <h1>Spelling Bee Duel</h1>
          <p className="welcome-text">Welcome,</p>
          <p className="player-name-display">{playerName}!</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Create Game */}
        <div className="game-card">
          <h3>Create New Game</h3>
          <p>Start a new game and invite others to join</p>
          <button
            className="btn btn-primary"
            onClick={handleCreateGame}
            disabled={isCreating || isJoining}
          >
            {isCreating ? 'Creating...' : 'Create Game'}
          </button>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>

        {/* Join Game */}
        <div className="game-card">
          <h3>Join Existing Game</h3>
          <p>Enter a room code to join a game</p>
          <div className="join-form">
            <input
              type="text"
              placeholder="Enter room code"
              value={inputRoomCode}
              onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoinGame();
                }
              }}
              maxLength={4}
              disabled={isCreating || isJoining}
            />
            <button
              className="btn btn-primary"
              onClick={handleJoinGame}
              disabled={isCreating || isJoining || !inputRoomCode.trim()}
            >
              {isJoining ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;