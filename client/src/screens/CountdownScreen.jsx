import { useEffect, useState } from 'react';
import '../css/CountdownScreen.css';

const CountdownScreen = ({ countdown, nextRound, isPracticeMode = false }) => {
  const [animationKey, setAnimationKey] = useState(0);

  // Trigger new animation when countdown changes
  useEffect(() => {
    if (countdown > 0) {
      setAnimationKey(prev => prev + 1);
    }
  }, [countdown]);

  // Determine classes based on practice mode
  const containerClass = isPracticeMode ? 'countdown-container practice-mode' : 'countdown-container';
  const roundCardClass = isPracticeMode ? 'round-card practice-round-card' : 'round-card';
  const readyTextClass = isPracticeMode ? 'ready-text practice-ready-text' : 'ready-text';

  return (
    <div className={containerClass}>
      <div className="countdown-content">
        <div className={roundCardClass}>
          <h2 className="round-text">
            {isPracticeMode ? 'Practice Mode' : `Round ${nextRound}`}
          </h2>
        </div>
        
        {/* Only show countdown number when > 0 */}
        {countdown > 0 && (
          <div 
            key={animationKey}
            className="countdown-number"
            aria-live="polite"
            aria-label={`${countdown} seconds remaining`}
          >
            {countdown}
          </div>
        )}
        
        <div className={readyTextClass}>
          Get Ready!
        </div>
      </div>
    </div>
  );
};

export default CountdownScreen;