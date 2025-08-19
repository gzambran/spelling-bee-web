const fs = require('fs');
const path = require('path');

class WordData {
  constructor() {
    this.puzzles = [];
    this.isLoaded = false;
  }

  // Calculate points for a word based on length
  calculateWordPoints(word) {
    const length = word.length;
    if (length < 4) {
      return 0;
    }
    
    // Exponential scoring: length² points
    return length * length;
  }

  // Calculate total points including pangram bonus
  calculateTotalPoints(word, isPangram) {
    const basePoints = this.calculateWordPoints(word);
    const pangramBonus = isPangram ? 25 : 0;
    return basePoints + pangramBonus;
  }

  // Load all puzzle data from JSON files
  async loadPuzzleData() {
    try {
      const dataDir = path.join(__dirname, 'data');
      
      if (!fs.existsSync(dataDir)) {
        throw new Error('Data directory not found. Run download-puzzles.js first.');
      }

      // Read all JSON files from the data directory
      const files = fs.readdirSync(dataDir)
        .filter(file => file.endsWith('.json') && file !== 'index.json')
        .sort();

      console.log(`📚 Loading ${files.length} puzzle files...`);

      this.puzzles = [];
      
      for (const file of files) {
        try {
          const filePath = path.join(dataDir, file);
          const data = fs.readFileSync(filePath, 'utf8');
          const puzzle = JSON.parse(data);
          
          // Validate puzzle structure
          if (this.isValidPuzzle(puzzle)) {
            this.puzzles.push(puzzle);
          } else {
            console.warn(`⚠️  Invalid puzzle structure in ${file}, skipping...`);
          }
        } catch (error) {
          console.warn(`⚠️  Error loading ${file}:`, error.message);
        }
      }

      this.isLoaded = true;
      console.log(`✅ Successfully loaded ${this.puzzles.length} puzzles`);
      
      return this.puzzles.length;
    } catch (error) {
      console.error('❌ Error loading puzzle data:', error.message);
      throw error;
    }
  }

  // Validate puzzle has required structure
  isValidPuzzle(puzzle) {
    return puzzle &&
           typeof puzzle.centerLetter === 'string' &&
           Array.isArray(puzzle.outerLetters) &&
           puzzle.outerLetters.length === 6 &&
           Array.isArray(puzzle.answers) &&
           puzzle.answers.length > 0 &&
           Array.isArray(puzzle.pangrams);
  }

  // Get a random puzzle for a new game with enhanced data for client validation
  getRandomPuzzle() {
    if (!this.isLoaded || this.puzzles.length === 0) {
      throw new Error('Puzzle data not loaded');
    }

    const randomIndex = Math.floor(Math.random() * this.puzzles.length);
    const puzzle = this.puzzles[randomIndex];
    
    console.log(`🎯 Selected puzzle: ${puzzle.displayDate || puzzle.printDate} (${puzzle.answers.length} words, ${puzzle.pangrams.length} pangrams)`);
    
    // Pre-calculate points for all valid words
    const wordPoints = {};
    const validWords = puzzle.answers.map(word => word.toLowerCase());
    const pangrams = puzzle.pangrams.map(pangram => pangram.toLowerCase());
    
    puzzle.answers.forEach(word => {
      const wordLower = word.toLowerCase();
      const isPangram = pangrams.includes(wordLower);
      wordPoints[wordLower] = this.calculateTotalPoints(word, isPangram);
    });
    
    console.log(`💰 Pre-calculated points for ${Object.keys(wordPoints).length} words`);
    
    return {
      centerLetter: puzzle.centerLetter,
      outerLetters: puzzle.outerLetters,
      validLetters: [puzzle.centerLetter, ...puzzle.outerLetters],
      validWords: validWords,
      pangrams: pangrams,
      wordPoints: wordPoints,
      answers: puzzle.answers,
      totalWords: puzzle.answers.length,
      totalPangrams: puzzle.pangrams.length,
      puzzleDate: puzzle.displayDate || puzzle.printDate
    };
  }

  // Validate if a word is correct for the given puzzle (keep for server-side use if needed)
  isValidWord(word, puzzle) {
    if (!word || !puzzle) {
      return false;
    }

    const wordLower = word.toLowerCase().trim();
    
    // Check minimum length (4 letters)
    if (wordLower.length < 4) {
      return false;
    }

    // Check if word contains center letter
    if (!wordLower.includes(puzzle.centerLetter.toLowerCase())) {
      return false;
    }

    // Check if word only uses available letters
    const availableLetters = puzzle.validLetters.map(l => l.toLowerCase());
    for (const letter of wordLower) {
      if (!availableLetters.includes(letter)) {
        return false;
      }
    }

    // Check if word is in the answer list - use validWords if available, fallback to answers
    const validWords = puzzle.validWords || puzzle.answers.map(a => a.toLowerCase());
    return validWords.includes(wordLower);
  }

  // Check if a word is a pangram (keep for server-side use if needed)
  isPangram(word, puzzle) {
    if (!word || !puzzle) {
      return false;
    }

    const wordLower = word.toLowerCase().trim();
    const pangrams = puzzle.pangrams || puzzle.pangrams.map(p => p.toLowerCase());
    return pangrams.includes(wordLower);
  }

  // Get statistics about loaded puzzles with date range
  getStats() {
    if (!this.isLoaded) {
      return { loaded: false };
    }

    // Calculate basic stats
    const totalWords = this.puzzles.reduce((sum, puzzle) => sum + puzzle.answers.length, 0);
    const totalPangrams = this.puzzles.reduce((sum, puzzle) => sum + puzzle.pangrams.length, 0);
    
    // Calculate date range
    let oldestDate = null;
    let newestDate = null;
    
    for (const puzzle of this.puzzles) {
      const dateStr = puzzle.printDate || puzzle.displayDate;
      if (!dateStr) continue;
      
      // Parse date (handle both YYYY-MM-DD and display formats)
      let puzzleDate;
      if (dateStr.includes('-')) {
        // Format: 2022-01-01
        puzzleDate = new Date(dateStr + 'T00:00:00');
      } else {
        // Format: "January 1, 2022"
        puzzleDate = new Date(dateStr);
      }
      
      if (isNaN(puzzleDate.getTime())) continue; // Skip invalid dates
      
      if (!oldestDate || puzzleDate < oldestDate) {
        oldestDate = puzzleDate;
      }
      if (!newestDate || puzzleDate > newestDate) {
        newestDate = puzzleDate;
      }
    }
    
    // Format date range for display
    let dateRange = 'Unknown';
    if (oldestDate && newestDate) {
      const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
      };
      
      const oldestFormatted = formatDate(oldestDate);
      const newestFormatted = formatDate(newestDate);
      
      if (oldestFormatted === newestFormatted) {
        dateRange = oldestFormatted;
      } else {
        dateRange = `${oldestFormatted} - ${newestFormatted}`;
      }
    }
    
    return {
      loaded: true,
      totalPuzzles: this.puzzles.length,
      totalWords,
      totalPangrams,
      avgWordsPerPuzzle: Math.round(totalWords / this.puzzles.length),
      avgPangramsPerPuzzle: Math.round((totalPangrams / this.puzzles.length) * 10) / 10,
      dateRange,
      oldestDate: oldestDate ? oldestDate.toISOString().split('T')[0] : null,
      newestDate: newestDate ? newestDate.toISOString().split('T')[0] : null
    };
  }
}

// Create singleton instance
const wordData = new WordData();

module.exports = wordData;