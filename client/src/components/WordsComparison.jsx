import '../css/WordsComparison.css';

const WordColumn = ({ title, words, allPlayersWords, isCurrentPlayer, playerScore }) => {
  // Get all words found by other players for comparison
  const otherPlayersWords = allPlayersWords
    .filter(playerWords => playerWords !== words)
    .flatMap(playerWords => playerWords || [])
    .map(w => w.word.toLowerCase());

  // Utility function to sort words by points (descending)
  const getSortedWords = (words) => {
    if (!Array.isArray(words)) return [];
    return [...words].sort((a, b) => b.points - a.points);
  };

  return (
    <div className={`word-column ${isCurrentPlayer ? 'current-player-column' : ''}`}>
      <h3 className="column-title">
        {title}
        <span className="player-score">{playerScore} pts</span>
      </h3>
      
      <div className="words-list">
        {getSortedWords(words).map((wordEntry, index) => {
          const isUniqueWord = !otherPlayersWords.includes(wordEntry.word.toLowerCase());
          
          return (
            <div 
              key={index} 
              className={`word-item ${isUniqueWord ? 'unique-word-item' : 'shared-word-item'}`}
            >
              <span className={`word-text ${wordEntry.isPangram ? 'pangram-word' : ''} ${isUniqueWord ? 'unique-word-text' : ''}`}>
                {wordEntry.word.toUpperCase()}
              </span>
              <div className="points-container">
                <span className={`word-points ${wordEntry.isPangram ? 'pangram-points' : ''} ${isUniqueWord ? 'unique-word-points' : ''}`}>
                  {wordEntry.points}
                </span>
                {wordEntry.isPangram && (
                  <span className="pangram-star">★</span>
                )}
                {isUniqueWord && (
                  <span className="unique-indicator" title="Only you found this word!">✨</span>
                )}
              </div>
            </div>
          );
        })}
        
        {words.length === 0 && (
          <div className="empty-state">
            <span className="empty-text">No words found</span>
          </div>
        )}
      </div>
    </div>
  );
};

const WordsComparison = ({ 
  allPlayersData,
  currentPlayerSocketId 
}) => {
  // Always use multi-player format
  if (!allPlayersData || allPlayersData.length === 0) {
    return (
      <div className="words-container">
        <p>No player data available</p>
      </div>
    );
  }

  // Create player data with titles
  const processedPlayersData = allPlayersData.map(player => ({
    ...player,
    isCurrentPlayer: player.socketId === currentPlayerSocketId,
    title: player.socketId === currentPlayerSocketId 
      ? `Your Words (${player.wordCount || 0})`
      : `${player.name} (${player.wordCount || 0})`
  }));

  // Sort players: current player first, then by score
  const sortedPlayers = [...processedPlayersData].sort((a, b) => {
    // Current player always comes first
    if (a.isCurrentPlayer) return -1;
    if (b.isCurrentPlayer) return 1;
    
    // Then sort by score (highest first)
    return (b.roundScore || 0) - (a.roundScore || 0);
  });

  // Determine layout based on number of players
  const getLayoutClass = (playerCount) => {
    if (playerCount <= 2) return 'two-column-layout';
    if (playerCount <= 4) return 'four-column-layout';
    return 'grid-layout'; // For 5+ players
  };

  const layoutClass = getLayoutClass(sortedPlayers.length);
  const allPlayersWords = sortedPlayers.map(p => p.words || []);

  return (
    <div className={`words-container ${layoutClass}`}>
      <h3 className="words-comparison-title">Word Details</h3>
      
      <div className="words-grid">
        {sortedPlayers.map((playerData) => (
          <WordColumn
            key={playerData.socketId}
            title={playerData.title}
            words={playerData.words || []}
            allPlayersWords={allPlayersWords}
            isCurrentPlayer={playerData.isCurrentPlayer}
            playerScore={playerData.roundScore || 0}
          />
        ))}
      </div>

      <div className="words-legend">
        <div className="legend-item">
          <span className="legend-indicator unique-word-indicator">✨</span>
          <span className="legend-text">Unique words (only you found)</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator shared-word-indicator">•</span>
          <span className="legend-text">Shared words (others found too)</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator pangram-indicator">★</span>
          <span className="legend-text">Pangrams</span>
        </div>
      </div>
    </div>
  );
};

export default WordsComparison;