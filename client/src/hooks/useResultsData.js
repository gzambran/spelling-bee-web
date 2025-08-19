import { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export const useResultsData = (roundResults, gameState, playerName) => {
  const [readyPressed, setReadyPressed] = useState(false);
  
  // FIX: Use useRef to persist animated value across re-renders
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animate in on mount
  useEffect(() => {
    // Reset animation value in case component re-mounts
    slideAnim.setValue(0);
    
    const animation = Animated.timing(slideAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    });
    
    animation.start();
    
    // FIX: Cleanup animation on unmount
    return () => {
      animation.stop();
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Parse player data from results
  const currentPlayerData = roundResults?.players 
    ? Object.values(roundResults.players).find(p => p.name === playerName)
    : null;
  
  const opponentData = roundResults?.players 
    ? Object.values(roundResults.players).find(p => p.name !== playerName)
    : null;

  // Get current game state player data for ready status
  const currentGamePlayer = gameState?.players.find(p => p.name === playerName);
  const opponentGamePlayer = gameState?.players.find(p => p.name !== playerName);

  // Calculate round winner
  const isCurrentRoundWinner = currentPlayerData && opponentData 
    ? currentPlayerData.roundScore > opponentData.roundScore 
    : false;
  const isRoundTie = currentPlayerData && opponentData 
    ? currentPlayerData.roundScore === opponentData.roundScore 
    : false;

  // Utility function to sort words by points
  const getSortedWords = (words) => {
    return [...words].sort((a, b) => b.points - a.points);
  };

  // Check if we have valid data
  const hasValidData = !!(roundResults && currentPlayerData && opponentData);

  return {
    // State
    readyPressed,
    setReadyPressed,
    slideAnim,
    
    // Player data
    currentPlayerData,
    opponentData,
    currentGamePlayer,
    opponentGamePlayer,
    
    // Computed values
    isCurrentRoundWinner,
    isRoundTie,
    hasValidData,
    
    // Utilities
    getSortedWords,
  };
};