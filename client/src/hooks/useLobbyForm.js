import { useState } from 'react';
import { Alert } from 'react-native';

export const useLobbyForm = () => {
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Update room code with auto-formatting
  const updateRoomCode = (text) => {
    // Keep only digits and limit to 4 characters
    const cleaned = text.replace(/[^0-9]/g, '').substring(0, 4);
    setInputRoomCode(cleaned);
  };

  // Handle create game
  const handleCreateGame = async (onCreateRoom, playerName) => {
    setIsCreating(true);
    
    try {
      await onCreateRoom(playerName);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle join game
  const handleJoinGame = async (onJoinRoom, playerName) => {
    if (!inputRoomCode || inputRoomCode.length !== 4) {
      Alert.alert('Invalid Room Code', 'Please enter a 4-digit room code.');
      return;
    }

    setIsJoining(true);
    
    try {
      await onJoinRoom(inputRoomCode, playerName); 
      setInputRoomCode('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to join room. Please check the room code and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return {
    inputRoomCode,
    updateRoomCode,
    isCreating,
    isJoining,
    handleCreateGame,
    handleJoinGame,
  };
};