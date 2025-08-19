import { useEffect, useState } from 'react';
import '../css/SubmissionDisplay.css';

const SubmissionDisplay = ({ submissionDisplay }) => {
  const [showMessage, setShowMessage] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Handle message display and animations
  useEffect(() => {
    if (submissionDisplay && submissionDisplay.message) {
      setShowMessage(true);
      // Increment key to trigger new animation
      setAnimationKey(prev => prev + 1);
    } else {
      setShowMessage(false);
    }
  }, [submissionDisplay]);

  // Determine message type class
  const getMessageTypeClass = () => {
    if (!submissionDisplay) return '';
    
    if (submissionDisplay.messageType === 'pangram') return 'pangram';
    if (submissionDisplay.messageType === 'success') return 'success';
    return 'error';
  };

  // Only show if there's a message
  if (!showMessage || !submissionDisplay?.message) {
    return <div className="submission-display-container" />;
  }

  return (
    <div className="submission-display-container">
      <div
        key={animationKey}
        className={`submission-message ${getMessageTypeClass()}`}
        role="status"
        aria-live="polite"
        aria-label={submissionDisplay.message}
      >
        <span className="message-text">
          {submissionDisplay.message}
        </span>
      </div>
    </div>
  );
};

export default SubmissionDisplay;