import '../css/LetterHexagon.css';

const LetterHexagon = ({ 
  centerLetter, 
  outerLetters, 
  onLetterPress, 
  canInteract = true,
  centerSize = 80,
  outerSize = 70,
  radius = 100
}) => {
  const handleLetterClick = (letter) => {
    if (canInteract && onLetterPress) {
      onLetterPress(letter);
    }
  };

  return (
    <div className="hexagon-container" style={{ 
      height: radius * 2 + centerSize + 20,
      width: radius * 2 + outerSize + 20 
    }}>
      {/* Center Letter */}
      <button
        className={`hexagon center-hexagon ${!canInteract ? 'disabled' : ''}`}
        style={{
          width: centerSize,
          height: centerSize,
        }}
        onClick={() => handleLetterClick(centerLetter)}
        disabled={!canInteract}
        type="button"
      >
        <span className="letter-text center-letter-text">
          {centerLetter.toUpperCase()}
        </span>
      </button>

      {/* Outer Letters */}
      {outerLetters.map((letter, index) => {
        // Calculate position for hexagonal layout
        const angle = (index * 60) * (Math.PI / 180);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <button
            key={`${letter}-${index}`}
            className={`hexagon outer-hexagon ${!canInteract ? 'disabled' : ''}`}
            style={{
              width: outerSize,
              height: outerSize,
              transform: `translate(${x}px, ${y}px)`,
            }}
            onClick={() => handleLetterClick(letter)}
            disabled={!canInteract}
            type="button"
          >
            <span className="letter-text outer-letter-text">
              {letter.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default LetterHexagon;