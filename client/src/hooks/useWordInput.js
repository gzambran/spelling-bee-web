import { useState, useCallback, useEffect, useRef } from 'react';

export const useWordInput = (gameState, timeRemaining, clearSubmissionDisplay) => {
  const [currentWord, setCurrentWord] = useState('');
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ref to prevent multiple Enter key submissions
  const lastSubmitTimeRef = useRef(0);
  const submitCooldownMs = 200; // Prevent rapid submissions

  // Get available letters for validation
  const getAvailableLetters = useCallback(() => {
    if (!gameState?.puzzle) return new Set();
    
    const letters = new Set();
    letters.add(gameState.puzzle.centerLetter.toLowerCase());
    gameState.puzzle.outerLetters.forEach(letter => 
      letters.add(letter.toLowerCase())
    );
    return letters;
  }, [gameState?.puzzle]);

  // Handle letter selection (both click and keyboard)
  const handleLetterPress = useCallback((letter) => {
    if (gameState?.roundStatus !== 'active' || isSubmitting || timeRemaining <= 0) return;
    
    // If there's a submission display showing, clear it when user starts typing
    if (clearSubmissionDisplay) {
      clearSubmissionDisplay();
    }
    
    const newWord = currentWord + letter.toLowerCase();
    const newSelected = [...selectedLetters, letter];
    
    setCurrentWord(newWord);
    setSelectedLetters(newSelected);
  }, [currentWord, selectedLetters, gameState?.roundStatus, isSubmitting, timeRemaining, clearSubmissionDisplay]);

  // Handle word deletion (backspace)
  const handleDeleteLetter = useCallback(() => {
    if (currentWord.length > 0 && !isSubmitting && timeRemaining > 0) {
      setCurrentWord(currentWord.slice(0, -1));
      setSelectedLetters(selectedLetters.slice(0, -1));
    }
  }, [currentWord, selectedLetters, isSubmitting, timeRemaining]);

  // Clear the current word and selection
  const clearCurrentWord = useCallback(() => {
    setCurrentWord('');
    setSelectedLetters([]);
  }, []);

  // Check if we can submit (basic validation)
  const canSubmit = useCallback(() => {
    return currentWord.length >= 4 && 
           gameState?.roundStatus === 'active' && 
           !isSubmitting && 
           timeRemaining > 0;
  }, [currentWord.length, gameState?.roundStatus, isSubmitting, timeRemaining]);

  // Check if we can delete
  const canDelete = useCallback(() => {
    return currentWord.length > 0 && !isSubmitting && timeRemaining > 0;
  }, [currentWord.length, isSubmitting, timeRemaining]);

  // Check if we can interact (press letters, etc.)
  const canInteract = useCallback(() => {
    return gameState?.roundStatus === 'active' && !isSubmitting && timeRemaining > 0;
  }, [gameState?.roundStatus, isSubmitting, timeRemaining]);

  // Set up keyboard event listeners
  useEffect(() => {
    const availableLetters = getAvailableLetters();
    
    const handleKeyDown = (event) => {
      // Don't handle keyboard input if game is not active
      if (!canInteract()) return;
      
      // Prevent default behavior for keys we handle
      const key = event.key.toLowerCase();
      
      if (key === 'enter') {
        event.preventDefault();
        
        // Prevent rapid submissions using cooldown
        const now = Date.now();
        if (now - lastSubmitTimeRef.current < submitCooldownMs) {
          return;
        }
        lastSubmitTimeRef.current = now;
        
        // Only submit if we can submit
        if (canSubmit()) {
          // We need to pass the submit function from parent
          // This will be handled in the GameScreen component
          const submitEvent = new CustomEvent('gameSubmitWord');
          window.dispatchEvent(submitEvent);
        }
        return;
      }
      
      if (key === 'backspace') {
        event.preventDefault();
        handleDeleteLetter();
        return;
      }
      
      // Handle letter input
      if (key.length === 1 && /[a-z]/.test(key)) {
        if (availableLetters.has(key)) {
          event.preventDefault();
          handleLetterPress(key);
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canInteract, canSubmit, handleLetterPress, handleDeleteLetter, getAvailableLetters]);

  return {
    // State
    currentWord,
    selectedLetters,
    isSubmitting,
    
    // Actions
    handleLetterPress,
    handleDeleteLetter,
    clearCurrentWord,
    setIsSubmitting,
    
    // Computed values
    canSubmit: canSubmit(),
    canDelete: canDelete(),
    canInteract: canInteract()
  };
};