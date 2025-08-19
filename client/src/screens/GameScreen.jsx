import React, { useCallback, useEffect } from 'react';
import '../css/GameScreen.css';

// Import our custom hooks
import { useSubmissionDisplay } from '../hooks/useSubmissionDisplay';
import { useGameState } from '../hooks/useGameState';
import { useWordInput } from '../hooks/useWordInput';
import { useWordValidation } from '../hooks/useWordValidation';

// Import our components
import GameHeader from '../components/GameHeader';
import SubmissionDisplay from '../components/SubmissionDisplay';
import LetterHexagon from '../components/LetterHexagon';
import GameActions from '../components/GameActions';


const GameScreen = ({ gameState, onSubmitRoundResults, playerName, timeRemaining }) => {
  // Initialize our custom hooks
  const {
    submittedWords,
    currentScore,
    shuffledOuterLetters,
    hasSubmittedResults,
    puzzleData,
    handleShuffleLetters,
    addSubmittedWord
  } = useGameState(gameState, timeRemaining, onSubmitRoundResults);

  const {
    submissionDisplay,
    showSubmission,
    clearSubmissionDisplay
  } = useSubmissionDisplay();

  const {
    currentWord,
    selectedLetters,
    isSubmitting,
    handleLetterPress,
    handleDeleteLetter,
    clearCurrentWord,
    setIsSubmitting,
    canSubmit,
    canDelete,
    canInteract
  } = useWordInput(gameState, timeRemaining, clearSubmissionDisplay);
  
  const { validateWord } = useWordValidation(puzzleData, submittedWords);

  // Show results submitted feedback when needed
  useEffect(() => {
    if (hasSubmittedResults) {
      showSubmission('', false, 0, false, 'Results submitted - waiting for opponent');
    }
  }, [hasSubmittedResults, showSubmission]);

  // Handle word submission with client-side validation
  const handleSubmitWord = useCallback(() => {
    if (!currentWord || currentWord.length < 4) {
      showSubmission(currentWord, false, 0, false, 'Word must be at least 4 letters');
      clearCurrentWord();
      return;
    }

    if (gameState?.roundStatus !== 'active') {
      showSubmission(currentWord, false, 0, false, 'Round is not active');
      clearCurrentWord();
      return;
    }

    if (timeRemaining <= 0) {
      showSubmission(currentWord, false, 0, false, 'Time\'s up!');
      clearCurrentWord();
      return;
    }

    if (isSubmitting) return; // Prevent double submission

    const wordToSubmit = currentWord;
    setIsSubmitting(true);

    // Use client-side validation
    const validation = validateWord(wordToSubmit);
    
    // Always clear current word after submission
    clearCurrentWord();
    
    if (validation.valid) {
      // Add word to local submitted words list
      addSubmittedWord(wordToSubmit.toLowerCase(), validation.points, validation.isPangram);
      
      // Show unified success display
      showSubmission(wordToSubmit, true, validation.points, validation.isPangram);
    } else {
      // Show unified error display
      showSubmission(wordToSubmit, false, 0, false, validation.error);
    }
    
    setIsSubmitting(false);
  }, [currentWord, gameState?.roundStatus, timeRemaining, isSubmitting, validateWord, clearCurrentWord, addSubmittedWord, showSubmission, setIsSubmitting]);

  // Listen for keyboard submit events
  useEffect(() => {
    const handleKeyboardSubmit = () => {
      handleSubmitWord();
    };

    window.addEventListener('gameSubmitWord', handleKeyboardSubmit);
    
    return () => {
      window.removeEventListener('gameSubmitWord', handleKeyboardSubmit);
    };
  }, [handleSubmitWord]);

  if (!gameState || !gameState.puzzle) {
    return (
      <div className="game-container">
        <div className="game-loading">
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  const { centerLetter } = gameState.puzzle;
  // Use shuffled letters for display (will persist between word submissions)
  const outerLetters = shuffledOuterLetters.length > 0 ? shuffledOuterLetters : gameState.puzzle.outerLetters;

  return (
    <div className="game-container">
      {/* Header */}
      <GameHeader 
        gameState={gameState}
        timeRemaining={timeRemaining}
        currentScore={currentScore}
      />

      {/* Current Word Display */}
      <div className="word-container">
        <div className="current-word">
          {submissionDisplay ? submissionDisplay.word : currentWord.toUpperCase()}
        </div>
      </div>

      {/* Unified Submission Display (Word + Notification) */}
      <SubmissionDisplay 
        submissionDisplay={submissionDisplay}
      />

      {/* Letter Hexagon */}
      <LetterHexagon
        centerLetter={centerLetter}
        outerLetters={outerLetters}
        onLetterPress={handleLetterPress}
        canInteract={canInteract}
      />

      {/* Action Buttons */}
      <GameActions
        onDeleteLetter={handleDeleteLetter}
        onShuffleLetter={handleShuffleLetters}
        onSubmitWord={handleSubmitWord}
        canDelete={canDelete}
        canInteract={canInteract}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default GameScreen;