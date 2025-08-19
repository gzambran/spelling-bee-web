import { useCallback } from 'react';

export const useWordValidation = (puzzleData, submittedWords) => {
  // Client-side word validation function
  const validateWord = useCallback((word) => {
    if (!puzzleData || !word) {
      return { valid: false, error: "Invalid puzzle data" };
    }

    const wordLower = word.toLowerCase().trim();

    // Check minimum length
    if (wordLower.length < 4) {
      return { valid: false, error: "Too short (4+ letters)" };
    }

    // Check if word contains center letter
    if (!wordLower.includes(puzzleData.centerLetter.toLowerCase())) {
      return { valid: false, error: "Must use center letter" };
    }

    // Check if word only uses available letters
    const availableLetters = [puzzleData.centerLetter.toLowerCase(), ...puzzleData.outerLetters.map(l => l.toLowerCase())];
    for (const letter of wordLower) {
      if (!availableLetters.includes(letter)) {
        return { valid: false, error: "Invalid letter used" };
      }
    }

    // Check if enhanced validation data is available
    if (!puzzleData.validWords || !puzzleData.wordPoints || !puzzleData.pangrams) {
      console.warn('⚠️ Enhanced puzzle data missing');
      return { valid: false, error: "Puzzle data incomplete" };
    }

    // Check if word is in valid word list
    if (!puzzleData.validWords.includes(wordLower)) {
      return { valid: false, error: "Not in word list" };
    }
    
    // Check if already submitted
    if (submittedWords.some(w => w.word === wordLower)) {
      return { valid: false, error: "Already found!" };
    }
    
    // Word is valid - get points and pangram status
    const points = puzzleData.wordPoints[wordLower] || 0;
    const isPangram = puzzleData.pangrams.includes(wordLower);
    
    return { 
      valid: true, 
      points,
      isPangram
    };
  }, [puzzleData, submittedWords]);

  return {
    validateWord
  };
};