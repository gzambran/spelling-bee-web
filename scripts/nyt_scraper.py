"""
Modified NYTimes Spelling Bee scraper for spelling-bee-duel project.
Based on tedmiston/spelling-bee-answers scraper but enhanced to:
- Fetch all available puzzles (today, yesterday, thisWeek, lastWeek)
- Check against existing data to avoid duplicates
- Work with the existing server/data directory structure
"""
import json
import logging
import re
from pathlib import Path
import requests
from bs4 import BeautifulSoup

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

class NYTimesSpellingBeeScraper:
    """
    Enhanced NYTimes Spelling Bee scraper that fetches all available puzzles.
    """
    
    def __init__(self, data_dir="/opt/docker/spelling-bee-web/server/data"):
        self.url = "https://www.nytimes.com/puzzles/spelling-bee"
        # Use absolute Docker path
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
    def get_existing_puzzle_dates(self):
        """
        Get set of dates for puzzles we already have.
        """
        existing_dates = set()
        for json_file in self.data_dir.glob("*.json"):
            if json_file.name != "index.json":
                # Extract date from filename (e.g., "2025-07-26.json")
                date_str = json_file.stem
                existing_dates.add(date_str)
        
        logging.info(f"Found {len(existing_dates)} existing puzzles")
        return existing_dates
        
    def fetch_page(self, url=None):
        """
        Fetch the contents of the page at the given URL.
        """
        logging.info("Fetching NYT Spelling Bee page...")
        if url is None:
            url = self.url
            
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers)
        if not response.ok:
            raise Exception(f"HTTP response code was not successful: {response.status_code}")
        return response
        
    def extract_game_data(self, response):
        """
        Parse the webpage extracting the JavaScript game data.
        """
        logging.info("Extracting game data from page...")
        soup = BeautifulSoup(response.content, "html.parser")
        game_data_script = soup.find("script", string=re.compile(r"window\.gameData"))
        
        if not game_data_script:
            raise Exception("Game data script was not found")
        return game_data_script
        
    def parse_all_game_data(self, game_data_script):
        """
        Parse ALL available puzzle data from the JavaScript.
        Returns dict with today, yesterday, thisWeek, lastWeek puzzles.
        """
        logging.info("Parsing all available puzzle data...")
        
        # Find the start and end of the JSON object
        script_text = game_data_script.text.strip()
        start_match = re.search(r'window\.gameData\s*=\s*', script_text)
        
        if not start_match:
            raise Exception("Could not find window.gameData assignment")
        
        json_start = start_match.end()
        
        # Count braces to find the matching closing brace
        brace_count = 0
        json_end = json_start
        
        for i, char in enumerate(script_text[json_start:], json_start):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    json_end = i + 1
                    break
        
        try:
            game_data_json = script_text[json_start:json_end]
            game_data = json.loads(game_data_json)
            past_puzzles = game_data.get('pastPuzzles', {})
            
            logging.info(f"Successfully parsed gameData with pastPuzzles")
            return past_puzzles
            
        except json.JSONDecodeError as e:
            raise Exception(f"JSON decoding of gameData failed: {e}")
    
    def collect_all_puzzles(self, past_puzzles_data):
        """
        Collect all individual puzzles from the pastPuzzles structure.
        Returns list of puzzle dictionaries.
        """
        all_puzzles = []
        
        # Collect today's puzzle
        if "today" in past_puzzles_data:
            all_puzzles.append(past_puzzles_data["today"])
            logging.info("Added today's puzzle")
            
        # Collect yesterday's puzzle  
        if "yesterday" in past_puzzles_data:
            all_puzzles.append(past_puzzles_data["yesterday"])
            logging.info("Added yesterday's puzzle")
            
        # Collect this week's puzzles
        if "thisWeek" in past_puzzles_data and isinstance(past_puzzles_data["thisWeek"], list):
            all_puzzles.extend(past_puzzles_data["thisWeek"])
            logging.info(f"Added {len(past_puzzles_data['thisWeek'])} puzzles from this week")
            
        # Collect last week's puzzles
        if "lastWeek" in past_puzzles_data and isinstance(past_puzzles_data["lastWeek"], list):
            all_puzzles.extend(past_puzzles_data["lastWeek"])
            logging.info(f"Added {len(past_puzzles_data['lastWeek'])} puzzles from last week")
            
        logging.info(f"Total puzzles collected: {len(all_puzzles)}")
        return all_puzzles
    
    def filter_new_puzzles(self, all_puzzles, existing_dates):
        """
        Filter out puzzles we already have, return only new ones.
        """
        new_puzzles = []
        
        for puzzle in all_puzzles:
            puzzle_date = puzzle.get("printDate")
            if puzzle_date and puzzle_date not in existing_dates:
                new_puzzles.append(puzzle)
                
        logging.info(f"Found {len(new_puzzles)} new puzzles to save")
        return new_puzzles
    
    def output_puzzle_data(self, puzzle_dict):
        """
        Write a single puzzle to disk.
        """
        puzzle_date = puzzle_dict["printDate"]
        file_path = self.data_dir / f"{puzzle_date}.json"
        
        if file_path.exists():
            logging.warning(f"File already exists, skipping: {file_path}")
            return False
            
        try:
            with open(file_path, "w") as fp:
                json.dump(puzzle_dict, fp, indent=2)
                fp.write("\n")  # Add trailing newline like original
            
            logging.info(f"✅ Saved puzzle: {file_path}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Failed to save {file_path}: {e}")
            return False
    
    def update_index_file(self):
        """
        Update the index.json file with current puzzle count.
        """
        try:
            json_files = [f.name for f in self.data_dir.glob("*.json") if f.name != "index.json"]
            json_files.sort()
            
            index_data = {
                "totalPuzzles": len(json_files),
                "files": json_files,
                "lastUpdated": "2025-07-26T00:00:00.000Z"  # You might want to use actual timestamp
            }
            
            index_path = self.data_dir / "index.json"
            with open(index_path, "w") as f:
                json.dump(index_data, f, indent=2)
            
            logging.info(f"📋 Updated index.json with {len(json_files)} puzzles")
            
        except Exception as e:
            logging.error(f"❌ Error updating index: {e}")
    
    def run(self):
        """
        Main execution function.
        """
        logging.info("🐝 Starting NYT Spelling Bee scraper...")
        
        try:
            # Get existing puzzle dates
            existing_dates = self.get_existing_puzzle_dates()
            
            # Fetch and parse the page
            response = self.fetch_page()
            game_data_script = self.extract_game_data(response)
            past_puzzles_data = self.parse_all_game_data(game_data_script)
            
            # Collect all available puzzles
            all_puzzles = self.collect_all_puzzles(past_puzzles_data)
            
            # Filter to only new puzzles
            new_puzzles = self.filter_new_puzzles(all_puzzles, existing_dates)
            
            if not new_puzzles:
                logging.info("✅ No new puzzles found - you're up to date!")
                return 0
            
            # Save new puzzles
            saved_count = 0
            for puzzle in new_puzzles:
                if self.output_puzzle_data(puzzle):
                    saved_count += 1
            
            # Update index
            self.update_index_file()
            
            logging.info(f"🎉 Successfully saved {saved_count} new puzzles!")
            return saved_count
            
        except Exception as e:
            logging.error(f"❌ Scraper failed: {e}")
            raise


def main():
    """
    Entry point for running the scraper.
    """
    try:
        scraper = NYTimesSpellingBeeScraper()
        new_puzzle_count = scraper.run()
        
        if new_puzzle_count > 0:
            print(f"\n✨ Downloaded {new_puzzle_count} new puzzles!")
        else:
            print("\n✅ All puzzles up to date!")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        exit(1)


if __name__ == "__main__":
    main()