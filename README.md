# Spelling Bee Duel - Game Design Document

## Overview
A head-to-head mobile word game for two players, inspired by WordRacers from the HousePlay app. Players compete to find as many words as possible from a set of 7 letters in 90-second rounds.

## Core Game Mechanics

### Game Structure
- **3 rounds total** - winner has highest total score across all rounds
- **90 seconds per round**
- **7 letters per round** (6 outer + 1 center, using NYT Spelling Bee letter sets)
- **Center letter must be included in every valid word**
- **4+ letter words only** - matches Spelling Bee dataset requirements
- **Letters can be reused** - no restrictions on letter repetition within words

### Scoring System
**Exponential scoring based on word length:**
- 4 letters = 4 points
- 5 letters = 9 points  
- 6 letters = 16 points
- 7 letters = 25 points

**Pangram Bonus:**
- **+25 bonus points** for any word using all 7 letters
- 7-letter pangram total = 50 points (25 base + 25 bonus)

**No speed bonuses** - pure word-finding skill based

### Round Flow
1. Both players receive the same 7 letters
2. 90-second timer starts
3. Players find words independently (no real-time visibility of opponent's words)
4. Timer ends, results revealed
5. Show both players' word lists side by side + running total scores
6. Manual "Ready for next round" confirmation required
7. Repeat for rounds 2 and 3
8. Declare winner based on total score

## Technical Architecture

### Platform
- **Frontend:** Expo React Native app
- **Backend:** Node.js + Express + Socket.io server
- **Deployment:** Docker on Mac mini (local network)
- **Real-time:** WebSocket connections for game state sync

### Data Source
**NYT Spelling Bee puzzle data:** https://github.com/tedmiston/spelling-bee-answers
- Each day is stored as individual JSON files with complete puzzle data
- **Center letter requirement maintained** (exactly like official Spelling Bee)
- Random puzzle selection for each game from available JSON files
- All valid words and pangrams are pre-validated in each JSON file

**JSON Structure Example:**
```json
{
  "displayDate": "January 1, 2023",
  "printDate": "2023-01-01", 
  "centerLetter": "e",
  "outerLetters": ["a","c","l","n","o","w"],
  "validLetters": ["e","a","c","l","n","o","w"],
  "pangrams": ["allowance"],
  "answers": ["allowance", "acne", "aeon", ...]
}
```

### Client-Side Architecture

**Modern React Native patterns with component extraction and custom hooks:**

#### **Custom Hooks**
- **`useFeedback`** - Message display system with timeout handling (fixes intermittent message issues)
- **`useGameState`** - Game state management (scores, words, puzzle data, auto-submission)
- **`useWordInput`** - Word building logic (letter selection, deletion, validation states)
- **`useWordValidation`** - Client-side word validation against puzzle data
- **`useLobbyForm`** - Form state and validation for lobby screens

#### **Reusable Components**
- **`GameHeader`** - Timer, round info, score display
- **`FeedbackMessage`** - Animated success/error messages
- **`RoundBreakdown`** - Consolidated round results table
- **`WinnerAnnouncement`** - Game over winner display
- **`FinalScoreComparison`** - Side-by-side final scores
- **`ActionButtons`** - Play Again vs Back to Lobby (with fixed functionality)
- **`CreateGameForm`** - Name input and create game flow
- **`JoinGameForm`** - Name + room code input and join flow
- **`PlayersList`** - Player status and ready indicators
- **`WaitingRoom`** - Complete waiting room experience
- **`HowToPlay`** - Collapsible game rules

#### **Key Technical Decisions**
- **Client-side validation** - All word validation happens locally for instant feedback
- **Enhanced puzzle data** - Server sends complete word lists, pangrams, and point values
- **Message queue solution** - Fixed intermittent message display issues with proper timeout cleanup
- **Keyboard handling** - `keyboardShouldPersistTaps="handled"` fixes double-tap button issues

## User Interface Design

### Letter Layout
- **6 outer letters + 1 center letter in hexagon formation** (exactly like Spelling Bee)
- **Center letter must be used in every valid word**
- Tap letters in sequence to build words
- Current word displays above the hexagon
- Submit button to confirm word

### Game Screens
1. **Lobby Screen** - Create/join game with room codes (refactored with forms)
2. **Game Screen** - Letter circle, timer, current word, instant feedback (refactored with hooks)
3. **Results Screen** - Both players' words side by side, scores, running totals
4. **Final Results** - Winner declaration, Play Again vs Back to Lobby (refactored layout)

### Visual Feedback
- Selected letters highlight briefly when tapped
- Submitted words appear in player's word list immediately
- **Fixed message system** - Success/error messages display reliably
- Timer prominently displayed with color coding
- Current round indicator (Round 1 of 3)

## Game Flow

### Starting Game
1. Player 1 creates game → receives room code
2. Player 2 joins with room code
3. Both players see "waiting for opponent" state
4. Game starts when both players ready

### During Round
1. Same 7 letters shown to both players
2. 90-second countdown timer
3. Players tap letters → build word → submit
4. **Instant client-side validation** with immediate feedback
5. Valid words added to player's list with points
6. No visibility of opponent's progress during round

### Between Rounds
1. Timer ends, all submissions locked
2. Results screen shows:
   - Both players' word lists side by side
   - Points for each word
   - Round total and running game total
   - Words opponent found that you missed
3. Manual "Ready for Round X" button
4. Next round starts when both players ready

### End Game
1. After round 3, show final results with **improved layout**
2. Declare winner with prominent display
3. **Play Again** - restart with same opponent (fixed functionality)
4. **Back to Lobby** - disconnect and find new opponents

## Technical Requirements

### Server Features
- Room management (create/join with codes)
- Game state synchronization
- **Game restart functionality** - handle "Play Again" flow
- Timer management with auto-submission
- Score calculation
- Enhanced puzzle data serving

### Client Features
- Real-time WebSocket connection
- Touch interface for letter selection
- **Instant word validation** with rich feedback
- Local word list display with immediate updates
- Timer countdown display
- **Improved results screens** with better spacing and layout
- **Fixed keyboard interactions** for smooth UX

### Data Management
- Download collection of individual JSON files (one per day) from GitHub repo
- Load all JSON files into memory on server startup for fast random selection
- Each game randomly selects one puzzle JSON file
- **Enhanced data structure** - includes word points and pangrams for client validation
- **Client-side validation** against complete word lists for instant feedback

## Development Architecture

### Current File Structure
```
client/
├── App.js (main app coordinator)
├── screens/
│   ├── LobbyScreen.js (refactored - now ~80 lines)
│   ├── GameScreen.js (refactored - now ~250 lines)
│   ├── ResultsScreen.js
│   ├── FinalResultsScreen.js (refactored with components)
│   └── CountdownScreen.js
├── components/ (NEW)
│   ├── GameHeader.js
│   ├── FeedbackMessage.js
│   ├── RoundBreakdown.js
│   ├── WinnerAnnouncement.js
│   ├── FinalScoreComparison.js
│   ├── ActionButtons.js
│   ├── CreateGameForm.js
│   ├── JoinGameForm.js
│   ├── PlayersList.js
│   ├── WaitingRoom.js
│   └── HowToPlay.js
├── hooks/ (NEW)
│   ├── useFeedback.js
│   ├── useGameState.js
│   ├── useWordInput.js
│   ├── useWordValidation.js
│   └── useLobbyForm.js
└── services/
    └── socketService.js

server/
├── server.js (updated with restart logic)
├── gameLogic.js (updated with restart methods)
├── roomManager.js
├── wordData.js
├── package.json
└── Dockerfile
```

### Refactoring Philosophy
**Component Extraction Benefits:**
- **Maintainability** - Each component has single responsibility
- **Reusability** - Components can be used across different screens
- **Testability** - Individual components can be tested in isolation
- **AI Collaboration** - Smaller files are easier for Claude to work with
- **Code Quality** - Cleaner separation of concerns

**Custom Hooks Benefits:**
- **Logic Reuse** - Stateful logic can be shared between components
- **Cleaner Components** - UI components focus on presentation
- **Better Testing** - Business logic is separated and testable
- **Performance** - Optimized re-renders and state management

### Development Notes

#### Word Validation
- **Client-side first** - Instant feedback using pre-loaded word lists
- Enhanced puzzle data includes complete word lists and point calculations
- Server validates during result submission for security

#### Performance Considerations
- Games are only 2 players - minimal server load
- Word lists cached in memory on server
- **Client-side validation** eliminates validation round-trips
- Component memoization where beneficial

#### Message System Fixes
- **Timeout cleanup** - Prevents old timeouts from clearing new messages
- **Animation interruption** - Proper handling of overlapping animations
- **Immediate replacement** - Latest message always shown for time-critical feedback

#### Keyboard Handling
- **`keyboardShouldPersistTaps="handled"`** - Fixes double-tap button issues
- **`Keyboard.dismiss()`** - Manual dismissal before actions
- **Proper return key types** - "next", "done" for better UX flow

### Future Considerations (Not MVP)
- Game history/stats tracking
- Multiple game formats
- Different word list sources (if commercializing)
- Performance optimizations for larger player counts
- Offline mode capabilities

## Development Patterns

### Component Guidelines
- **Single Responsibility** - Each component handles one specific UI concern
- **Props Interface** - Clear, minimal props with TypeScript-like clarity
- **Styling Consistency** - Shared design tokens and consistent spacing
- **Error Boundaries** - Graceful handling of component failures

### Hook Guidelines
- **State Encapsulation** - Keep related state together in custom hooks
- **Pure Functions** - Hooks return consistent interfaces
- **Dependencies** - Careful management of useEffect dependencies
- **Performance** - Use useCallback and useMemo where beneficial

## Open Questions
- Performance optimization opportunities as game scales
- Additional game modes or variations
- Enhanced accessibility features
- Internationalization support

---