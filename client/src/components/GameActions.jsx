import React from 'react';
import '../css/GameActions.css';

const GameActions = ({ 
  onDeleteLetter,
  onShuffleLetter,
  onSubmitWord,
  canDelete = false,
  canInteract = true,
  canSubmit = false,
  isSubmitting = false
}) => {
  
  const handleDeleteClick = () => {
    if (canDelete && onDeleteLetter) {
      onDeleteLetter();
    }
  };

  const handleShuffleClick = () => {
    if (canInteract && onShuffleLetter) {
      onShuffleLetter();
    }
  };

  const handleSubmitClick = () => {
    if (canSubmit && onSubmitWord && !isSubmitting) {
      onSubmitWord();
    }
  };

  return (
    <div className="game-actions">
      {/* Delete Button */}
      <button
        className={`action-button delete-button ${!canDelete ? 'disabled' : ''}`}
        onClick={handleDeleteClick}
        disabled={!canDelete}
        type="button"
        aria-label="Delete last letter"
      >
        <span className="button-text">Delete</span>
      </button>

      {/* Shuffle Button */}
      <button
        className={`action-button shuffle-button ${!canInteract ? 'disabled' : ''}`}
        onClick={handleShuffleClick}
        disabled={!canInteract}
        type="button"
        aria-label="Shuffle letters"
      >
        <span className="shuffle-icon">⟲</span>
      </button>

      {/* Submit Button */}
      <button
        className={`action-button submit-button ${!canSubmit ? 'disabled' : ''} ${isSubmitting ? 'submitting' : ''}`}
        onClick={handleSubmitClick}
        disabled={!canSubmit || isSubmitting}
        type="button"
        aria-label={isSubmitting ? 'Validating word' : 'Submit word'}
      >
        <span className="button-text">
          {isSubmitting ? 'Enter' : 'Enter'}
        </span>
      </button>
    </div>
  );
};

export default GameActions;