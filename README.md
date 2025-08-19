# Spelling Bee Web - Multiplayer Word Game

## Overview
A real-time multiplayer word game (2-8 players) inspired by the New York Times Spelling Bee. Players compete to find as many words as possible from a set of 7 letters in timed rounds. Converted from mobile to web platform with enhanced multiplayer support.

## Core Game Mechanics

### Game Structure
- **3 rounds total** - winner has highest total score across all rounds
- **90 seconds per round**
- **7 letters per round** (6 outer + 1 center, using NYT Spelling Bee letter sets)
- **Center letter must be included in every valid word**
- **4+ letter words only** - matches Spelling Bee dataset requirements
- **Letters can be reused** - no restrictions on letter repetition within words
- **2-8 players** - scalable multiplayer design

### Scoring System
**Exponential scoring based on word length:**
- 4 letters = 16 points (4²)
- 5 letters = 25 points (5²)
- 6 letters = 36 points (6²)
- 7+ letters = length² points

**Pangram Bonus:**
- **+25 bonus points** for any word using all 7 letters
- 7-letter pangram total = 74 points (49 base + 25 bonus)

### Round Flow
1. All players receive the same 7 letters
2. 90-second timer starts
3. Players find words independently
4. Timer ends, results revealed in leaderboard format
5. Show all players' word lists with unique word highlighting
6. Manual "Ready for next round" confirmation required
7. Repeat for rounds 2 and 3
8. Declare winner based on total score

## Technical Architecture

### Platform
- **Frontend:** React + Vite web application
- **Backend:** Node.js + Express + Socket.io server
- **Deployment:** Docker containerized
- **Real-time:** WebSocket connections for game state sync

### Input Methods
- **Mouse/Touch:** Click hexagon letters to build words
- **Keyboard:** Type letters directly, use Backspace to delete, Enter to submit
- **Hybrid:** Both input methods work simultaneously

### Data Source
**NYT Spelling Bee puzzle data:** 2,554+ historical puzzles (2018-2025)
- Each day stored as individual JSON files with complete puzzle data
- **Center letter requirement maintained** (exactly like official Spelling Bee)
- Random puzzle selection for each game from available dataset
- All valid words and pangrams are pre-validated

### Client Architecture

**Modern React patterns with hooks and component extraction:**

#### **Custom Hooks**
- **`useSubmissionDisplay`** - Unified word submission feedback system
- **`useGameState`** - Game state management (scores, words, puzzle data, auto-submission)
- **`useWordInput`** - Word building logic with keyboard support
- **`useWordValidation`** - Client-side word validation against puzzle data

#### **Key Components**
- **`GameHeader`** - Timer, round info, score display
- **`SubmissionDisplay`** - Animated success/error messages with pangram celebrations
- **`LetterHexagon`** - Interactive hexagonal letter layout with crisp rendering
- **`GameActions`** - Delete, Shuffle, Submit buttons
- **`WordsComparison`** - Multi-player word comparison with unique word highlighting
- **`KeyboardIndicator`** - Hints for keyboard input (removed for cleaner UX)

#### **Technical Features**
- **Client-side validation** - Instant feedback without server round-trips
- **Keyboard event handling** - Comprehensive keyboard support with cooldown protection
- **Pixel-perfect rendering** - Crisp hexagon graphics with optimized CSS
- **Layout stability** - Fixed heights prevent shifting during gameplay
- **Multi-player scaling** - Responsive design for 2-8 players

## User Interface Design

### Letter Layout
- **Hexagonal arrangement** - 6 outer letters surrounding 1 center letter
- **Crisp rendering** - Pixel-perfect positioning with optimized anti-aliasing
- **Dual input support** - Click letters OR type on keyboard
- **Visual feedback** - Hover effects and active states

### Game Screens
1. **Lobby Screen** - Create/join game with room codes
2. **Countdown Screen** - 3-2-1 countdown before each round
3. **Game Screen** - Hexagon interface with timer and word input
4. **Results Screen** - Leaderboard with detailed word comparison
5. **Final Results** - Winner celebration with performance breakdown

### Visual Feedback
- **Real-time typing** - Letters appear as you type/click
- **Submission animations** - Success/error messages with type-specific styling
- **Pangram celebrations** - Special animations for bonus words
- **Leaderboard rankings** - Medal system (🥇🥈🥉) with current player highlighting
- **Unique word highlighting** - Visual distinction for words only you found

## Multiplayer Features

### Scalable Design
- **Consistent interface** - Same leaderboard design for 2-8 players
- **Dynamic layouts** - Word comparison adapts to player count
- **Ready status tracking** - Shows which players are ready for next round
- **Real-time notifications** - Toast messages when players join/ready up

### Game Flow
1. **Room Creation** - Host creates room, gets shareable code
2. **Player Joining** - Others join using room code
3. **Lobby Waiting** - All players must ready up to start
4. **Synchronized Rounds** - All players get same puzzles simultaneously
5. **Results Sharing** - Compare words and see who found unique terms
6. **Game Restart** - Play again with same group or return to lobby

## Technical Implementation

### Server Features (No Authentication)
- **Room management** - Create/join with simple room codes
- **Game state sync** - Real-time multiplayer coordination
- **Timer management** - Server-side round timing with auto-submission
- **Puzzle serving** - Random selection from 2,554+ puzzle dataset
- **No user accounts** - Simplified for immediate play

### Client Features
- **Real-time WebSocket** - Instant game state updates
- **Keyboard + Mouse** - Dual input method support
- **Instant validation** - Client-side word checking for immediate feedback
- **Responsive design** - Works on desktop, tablet, and mobile
- **Layout stability** - No shifting elements during gameplay
- **Performance optimized** - 60fps animations and smooth interactions

### Code Quality
- **Clean architecture** - Separated concerns with custom hooks
- **Consistent styling** - Streamlined CSS without redundancy
- **Error handling** - Graceful degradation and user feedback
- **Type safety** - PropTypes and consistent interfaces
- **Modern patterns** - React hooks, functional components

## Development Structure

### Frontend Architecture
```
client/
├── src/
│   ├── screens/
│   │   ├── LobbyScreen.jsx
│   │   ├── CountdownScreen.jsx
│   │   ├── GameScreen.jsx (keyboard + mouse input)
│   │   ├── ResultsScreen.jsx (leaderboard style only)
│   │   └── FinalResultsScreen.jsx
│   ├── components/
│   │   ├── GameHeader.jsx
│   │   ├── SubmissionDisplay.jsx
│   │   ├── LetterHexagon.jsx (crisp rendering)
│   │   ├── GameActions.jsx
│   │   └── WordsComparison.jsx (multi-player)
│   ├── hooks/
│   │   ├── useSubmissionDisplay.js
│   │   ├── useGameState.js
│   │   ├── useWordInput.js (with keyboard support)
│   │   └── useWordValidation.js
│   ├── css/ (streamlined, no legacy styles)
│   └── services/
│       └── socketService.js
├── package.json (React + Vite)
└── vite.config.js
```

### Backend Architecture
```
server/
├── server.js (static file serving + API)
├── socketHandlers.js (no auth, simplified)
├── gameLogic.js (2-8 player support)
├── roomManager.js
├── wordData.js (2,554 puzzles loaded)
├── data/ (historical puzzle JSON files)
├── package.json
└── Dockerfile
```

## Key Improvements from Mobile Version

### Enhanced Multiplayer
- **Scalable to 8 players** (was 2-player only)
- **Consistent leaderboard UI** for all player counts
- **Better ready state management** across multiple players

### Input Improvements
- **Keyboard support** - Type letters, use Backspace/Enter
- **Dual input modes** - Keyboard and mouse work together
- **Layout stability** - No shifting when typing/clearing words

### Visual Polish
- **Crisp hexagon rendering** - Pixel-perfect graphics
- **Streamlined CSS** - Removed 40% of unused styles
- **Consistent design language** - Single approach for all screens

### Technical Debt Reduction
- **Removed authentication** - No user accounts needed for web version
- **Simplified architecture** - Cleaner separation of concerns
- **Better error handling** - Graceful failures and user feedback

## Performance Characteristics

### Client Performance
- **Instant word validation** - No server round-trips
- **Optimized rendering** - Hardware-accelerated hexagons
- **Minimal re-renders** - Proper React optimization
- **Smooth animations** - 60fps feedback and transitions

### Server Performance
- **In-memory puzzle data** - Fast puzzle selection
- **Room-based scaling** - Supports multiple concurrent games
- **Efficient WebSocket handling** - Minimal bandwidth usage
- **Docker optimized** - Quick startup and deployment

## Future Considerations

### Potential Enhancements
- **Custom room settings** - Adjustable round count/duration
- **Spectator mode** - Watch games in progress
- **Tournament brackets** - Multi-round elimination
- **Word definitions** - Educational hover tooltips
- **Statistics tracking** - Session-based performance metrics

### Technical Improvements
- **Progressive Web App** - Install as mobile app
- **Offline mode** - Play against cached puzzles
- **Accessibility** - Screen reader and keyboard navigation
- **Internationalization** - Multi-language support

---

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Docker Deployment
```bash
# Build and run
docker-compose up --build

# Access at http://localhost:3002
```

---

*This README serves as comprehensive documentation for future development and maintenance.*