import { useState, useEffect, useCallback } from 'react';

export const useGameState = (gameState, timeRemaining, onSubmitRoundResults) => {

  const [submittedWords, setSubmittedWords] = useState([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [shuffledOuterLetters, setShuffledOuterLetters] = useState([]);
  const [currentPuzzleId, setCurrentPuzzleId] = useState(null);
  const [hasSubmittedResults, setHasSubmittedResults] = useState(false);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const puzzleData = gameState?.puzzle;

  useEffect(() => {
    if (puzzleData) {
      console.log('🧩 Puzzle data received:', {
        centerLetter: puzzleData.centerLetter,
        outerLetters: puzzleData.outerLetters,
        hasValidWords: !!puzzleData.validWords,
        validWordsCount: puzzleData.validWords?.length || 0,
        hasPangrams: !!puzzleData.pangrams,
        pangramsCount: puzzleData.pangrams?.length || 0,
        hasWordPoints: !!puzzleData.wordPoints,
        wordPointsCount: Object.keys(puzzleData.wordPoints || {}).length
      });
    }
  }, [puzzleData]);

  // Initialize shuffled letters ONLY when puzzle actually changes (new round)
  useEffect(() => {
    if (gameState?.puzzle?.outerLetters) {
      // Create a unique puzzle ID based on center + outer letters
      const puzzleId = gameState.puzzle.centerLetter + gameState.puzzle.outerLetters.join('');
      
      // Only reset shuffle if this is actually a different puzzle
      if (puzzleId !== currentPuzzleId) {
        console.log('🎲 New puzzle detected, shuffling letters:', puzzleId);
        setShuffledOuterLetters([...gameState.puzzle.outerLetters]);
        setCurrentPuzzleId(puzzleId);
        // Reset local game state for new round
        setSubmittedWords([]);
        setCurrentScore(0);
        setHasSubmittedResults(false);
        setSubmissionAttempts(0);
        setIsRetrying(false);
      }
    }
  }, [gameState?.puzzle?.centerLetter, gameState?.puzzle?.outerLetters, currentPuzzleId]);

  // Auto-submit results when server time expires
  useEffect(() => {
    if (timeRemaining === 0 && !hasSubmittedResults && !isRetrying) {
      console.log('⏰ Server time expired - auto-submitting results');
      handleSubmitResults();
    }
  }, [timeRemaining, hasSubmittedResults, isRetrying]);

  const handleSubmitResults = useCallback(async (attemptNumber = 1) => {
    if (hasSubmittedResults) return; // Prevent double submission
    
    const maxAttempts = 3;
    setSubmissionAttempts(attemptNumber);
    
    if (attemptNumber > 1) {
      setIsRetrying(true);
      console.log(`📊 Retrying submission (attempt ${attemptNumber}/${maxAttempts})`);
    } else {
      console.log('📊 Submitting round results:', submittedWords.length, 'words,', currentScore, 'points');
    }
    
    try {
      if (onSubmitRoundResults) {
        await onSubmitRoundResults(submittedWords, currentScore);
        console.log('✅ Results submitted successfully');
        setHasSubmittedResults(true);
        setIsRetrying(false);
      }
    } catch (error) {
      console.error(`❌ Submission attempt ${attemptNumber} failed:`, error.message);
      
      if (attemptNumber < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s
        const retryDelay = 1000 * Math.pow(2, attemptNumber - 1);
        console.log(`🔄 Retrying in ${retryDelay}ms...`);
        
        setTimeout(() => {
          handleSubmitResults(attemptNumber + 1);
        }, retryDelay);
      } else {
        // All attempts failed - this is a serious issue
        console.error('🚨 All submission attempts failed! Player will get 0 points.');
        setIsRetrying(false);
        
        // TODO: Show user notification about submission failure
        // For now, just log the critical error
        console.error('CRITICAL: Round results could not be submitted after 3 attempts');
        console.error('Player data:', { submittedWords: submittedWords.length, currentScore });
        console.error('Game state:', { 
          roundStatus: gameState?.roundStatus, 
          currentRound: gameState?.currentRound,
          timeRemaining 
        });
      }
    }
  }, [submittedWords, currentScore, hasSubmittedResults, onSubmitRoundResults, gameState]);

  // Shuffle function that keeps center letter in place (client-side only)
  const handleShuffleLetters = useCallback(() => {
    if (!shuffledOuterLetters.length || timeRemaining <= 0) return;
    
    // Create a shuffled copy of outer letters
    const shuffled = [...shuffledOuterLetters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Update local state only - this will persist now
    setShuffledOuterLetters(shuffled);
  }, [shuffledOuterLetters, timeRemaining]);

  // Add a valid word to submitted words
  const addSubmittedWord = useCallback((word, points, isPangram) => {
    const newWord = {
      word: word.toLowerCase(),
      points,
      isPangram
    };
    
    setSubmittedWords(prev => [...prev, newWord]);
    setCurrentScore(prev => prev + points);
    
    console.log(`✅ Word added locally: ${word} (${points} pts${isPangram ? ', PANGRAM!' : ''})`);
  }, []);

  return {
    submittedWords,
    currentScore,
    shuffledOuterLetters,
    hasSubmittedResults,
    puzzleData,
    submissionAttempts,
    isRetrying,
    handleShuffleLetters,
    addSubmittedWord,
    handleSubmitResults
  };
};