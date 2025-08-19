#!/usr/bin/env python3
"""
NYTBee.com Gap Filler Scraper
Fills the gap in puzzle data from 2025-03-06 to 2025-07-13
Uses the proven parsing logic from our successful test.
"""

import json
import re
import time
from datetime import datetime, timedelta
from pathlib import Path
import requests
from bs4 import BeautifulSoup


class NYTBeeGapFiller:
    def __init__(self, data_dir="/opt/docker/spelling-bee-duel/server/data"):
        self.data_dir = Path(data_dir)
        self.base_url = "https://nytbee.com/Bee_{}.html"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        # Ensure data directory exists
        if not self.data_dir.exists():
            print(f"❌ Data directory not found: {self.data_dir}")
            exit(1)
    
    def get_existing_dates(self):
        """Get set of dates we already have puzzles for"""
        existing_dates = set()
        for json_file in self.data_dir.glob("*.json"):
            if json_file.name != "index.json":
                date_str = json_file.stem
                existing_dates.add(date_str)
        return existing_dates
    
    def generate_gap_dates(self):
        """Generate list of dates in the gap period"""
        start_date = datetime(2025, 3, 6)
        end_date = datetime(2025, 7, 13)
        
        dates = []
        current_date = start_date
        while current_date <= end_date:
            dates.append(current_date.strftime('%Y-%m-%d'))
            current_date += timedelta(days=1)
        
        return dates
    
    def scrape_puzzle_data(self, date_str):
        """
        Scrape puzzle data for a specific date
        Uses the proven logic from our test
        """
        # Convert date to URL format
        formatted_date = date_str.replace("-", "")
        url = self.base_url.format(formatted_date)
        
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            
            # Parse HTML
            soup = BeautifulSoup(response.content, 'html.parser')
            puzzle_data = self.extract_puzzle_data(soup, date_str)
            
            return puzzle_data
            
        except requests.RequestException as e:
            print(f"   ❌ Error fetching {date_str}: {e}")
            return None
        except Exception as e:
            print(f"   ❌ Error parsing {date_str}: {e}")
            return None
    
    def extract_puzzle_data(self, soup, date_str):
        """
        Extract puzzle data from parsed HTML
        Exact same logic as our successful test
        """
        # Parse date for display format
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        display_date = date_obj.strftime("%B %d, %Y")
        display_weekday = date_obj.strftime("%A")
        
        # Extract words and pangrams
        answers = []
        pangrams = []
        
        # Find the main answer list
        answer_list = soup.find("div", {"id": "main-answer-list"})
        if not answer_list:
            raise Exception("Could not find main answer list")
        
        for li in answer_list.find_all("li"):
            # Check for pangram (marked with <mark><strong>)
            mark_tag = li.find("mark")
            if mark_tag and mark_tag.find("strong"):
                word = mark_tag.find("strong").get_text().strip()
                pangrams.append(word)
                answers.append(word)
            else:
                # Regular word
                flex_div = li.find("div", class_="flex-list-item")
                if flex_div:
                    word = flex_div.get_text().split("↗")[0].strip()
                    if word:
                        answers.append(word)
        
        if not answers:
            raise Exception("No words found in puzzle")
        
        # Determine center letter (appears in ALL words)
        letter_counts = {}
        for word in answers:
            for letter in set(word.lower()):
                letter_counts[letter] = letter_counts.get(letter, 0) + 1
        
        center_letter = None
        for letter, count in letter_counts.items():
            if count == len(answers):
                center_letter = letter
                break
        
        if not center_letter:
            raise Exception("Could not determine center letter")
        
        # Get all unique letters
        all_letters = set()
        for word in answers:
            all_letters.update(word.lower())
        
        # Outer letters = all letters except center
        outer_letters = sorted(list(all_letters - {center_letter}))
        valid_letters = [center_letter] + outer_letters
        
        # Generate puzzle ID
        puzzle_id = int(date_obj.timestamp())
        
        # Build puzzle data in your format
        puzzle_data = {
            "displayWeekday": display_weekday,
            "displayDate": display_date,
            "printDate": date_str,
            "centerLetter": center_letter,
            "outerLetters": outer_letters,
            "validLetters": valid_letters,
            "pangrams": pangrams,
            "answers": answers,
            "id": puzzle_id,
            "freeExpiration": 0,
            "editor": "Sam Ezersky"
        }
        
        return puzzle_data
    
    def save_puzzle(self, puzzle_data, date_str):
        """Save puzzle data to JSON file"""
        file_path = self.data_dir / f"{date_str}.json"
        
        try:
            with open(file_path, 'w') as f:
                json.dump(puzzle_data, f, indent=2)
            return True
        except Exception as e:
            print(f"   ❌ Error saving {date_str}: {e}")
            return False
    
    def update_index(self):
        """Update the index.json file"""
        try:
            json_files = [f.name for f in self.data_dir.glob("*.json") if f.name != "index.json"]
            json_files.sort()
            
            index_data = {
                "totalPuzzles": len(json_files),
                "files": json_files,
                "lastUpdated": datetime.now().isoformat()
            }
            
            index_path = self.data_dir / "index.json"
            with open(index_path, 'w') as f:
                json.dump(index_data, f, indent=2)
            
            print(f"📋 Updated index.json with {len(json_files)} puzzles")
            
        except Exception as e:
            print(f"❌ Error updating index: {e}")
    
    def fill_gap(self):
        """Main function to fill the gap in puzzle data"""
        print("🐝 NYTBee Gap Filler Starting...")
        print("=" * 50)
        
        # Get existing dates
        existing_dates = self.get_existing_dates()
        print(f"📊 Found {len(existing_dates)} existing puzzles")
        
        # Get gap dates
        gap_dates = self.generate_gap_dates()
        print(f"📅 Gap period: 2025-03-06 to 2025-07-13 ({len(gap_dates)} days)")
        
        # Filter to only missing dates
        missing_dates = [date for date in gap_dates if date not in existing_dates]
        print(f"🎯 Missing dates to fill: {len(missing_dates)}")
        
        if not missing_dates:
            print("✅ No missing dates found - gap is already filled!")
            return
        
        # Show first few and last few dates
        if len(missing_dates) > 10:
            preview = missing_dates[:5] + ["..."] + missing_dates[-5:]
            print(f"📝 Dates to scrape: {', '.join(preview)}")
        else:
            print(f"📝 Dates to scrape: {', '.join(missing_dates)}")
        
        print("\n🚀 Starting gap fill process...")
        
        success_count = 0
        error_count = 0
        
        for i, date_str in enumerate(missing_dates, 1):
            print(f"\n📅 [{i}/{len(missing_dates)}] Processing {date_str}...")
            
            # Scrape the puzzle
            puzzle_data = self.scrape_puzzle_data(date_str)
            
            if puzzle_data:
                # Save the puzzle
                if self.save_puzzle(puzzle_data, date_str):
                    success_count += 1
                    print(f"   ✅ Saved {date_str} ({len(puzzle_data['answers'])} words, {len(puzzle_data['pangrams'])} pangrams)")
                else:
                    error_count += 1
            else:
                error_count += 1
            
            # Be nice to the server
            time.sleep(1)
            
            # Progress update every 10 puzzles
            if i % 10 == 0:
                print(f"\n📊 Progress: {i}/{len(missing_dates)} processed ({success_count} success, {error_count} errors)")
        
        # Final summary
        print("\n" + "=" * 50)
        print("🎉 Gap filling complete!")
        print(f"✅ Successfully downloaded: {success_count} puzzles")
        print(f"❌ Errors: {error_count} puzzles")
        
        if success_count > 0:
            # Update index
            self.update_index()
            print(f"💾 Your dataset now has {len(existing_dates) + success_count} total puzzles")
        
        if error_count > 0:
            print(f"⚠️  {error_count} puzzles failed - you can re-run this script to retry")


def main():
    """Run the gap filler"""
    try:
        filler = NYTBeeGapFiller()
        filler.fill_gap()
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")


if __name__ == "__main__":
    main()