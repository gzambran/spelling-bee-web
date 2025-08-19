import '../css/LetterHexagon.css';

const LetterHexagon = ({ 
  centerLetter, 
  outerLetters, 
  onLetterPress, 
  canInteract = true
}) => {
  const handleLetterClick = (letter) => {
    if (canInteract && onLetterPress) {
      onLetterPress(letter);
    }
  };

  // NYT's exact SVG hexagon coordinates and viewBox
  const hexagonPoints = "0,51.96152422706631 30,0 90,0 120,51.96152422706631 90,103.92304845413263 30,103.92304845413263";
  const viewBox = "0 0 120 103.92304845413263";

  // NYT's exact positioning from transform matrices
  const positions = [
    { x: 0, y: -90.40625 },           // Outer 1: top
    { x: 78.292969, y: -45.203125 },  // Outer 2: top-right
    { x: 78.292969, y: 45.203125 },   // Outer 3: bottom-right
    { x: 0, y: 90.40625 },            // Outer 4: bottom
    { x: -78.292969, y: 45.203125 },  // Outer 5: bottom-left
    { x: -78.292969, y: -45.203125 }  // Outer 0: top-left
  ];

  return (
    <div className="hexagon-container">
      {/* Center Hexagon */}
      <svg 
        className="hive-cell center" 
        viewBox={viewBox}
        onClick={() => handleLetterClick(centerLetter)}
        style={{ cursor: canInteract ? 'pointer' : 'not-allowed' }}
      >
        <polygon 
          className="cell-fill center-fill" 
          points={hexagonPoints} 
          stroke="rgba(200, 200, 200, 0.3)" 
          strokeWidth="1.5"
        />
        <text 
          className="cell-letter center-letter" 
          x="50%" 
          y="50%" 
          dy="0.35em"
          textAnchor="middle"
        >
          {centerLetter.toUpperCase()}
        </text>
      </svg>

      {/* Outer Hexagons */}
      {outerLetters.map((letter, index) => {
        const position = positions[index];
        return (
          <svg 
            key={`${letter}-${index}`}
            className="hive-cell outer" 
            viewBox={viewBox}
            onClick={() => handleLetterClick(letter)}
            style={{ 
              cursor: canInteract ? 'pointer' : 'not-allowed',
              transform: `translate(${position.x}px, ${position.y}px)`
            }}
          >
            <polygon 
              className="cell-fill outer-fill" 
              points={hexagonPoints} 
              stroke="rgba(200, 200, 200, 0.3)" 
              strokeWidth="1.5"
            />
            <text 
              className="cell-letter outer-letter" 
              x="50%" 
              y="50%" 
              dy="0.35em"
              textAnchor="middle"
            >
              {letter.toUpperCase()}
            </text>
          </svg>
        );
      })}
    </div>
  );
};

export default LetterHexagon;