#!/usr/bin/env python3
"""
Fixed NYTBee Historical Scraper
Handles both modern format (2025+) and historical format (2022 and earlier)
where words are embedded in JavaScript/Bokeh data instead of HTML.

FIXES:
- Corrected regex pattern for Bokeh word data extraction
- Improved pangram detection and validation
- Added better debugging output
- Enhanced error handling for edge cases
"""

import json
import re
import time
from datetime import datetime, timedelta
from pathlib import Path
import requests
from bs4 import BeautifulSoup
import calendar


class NYTBeeHistoricalScraperFixed:
    def __init__(self, data_dir="/opt/docker/spelling-bee-duel/server/data"):
        self.data_dir = Path(data_dir)
        self.base_url = "https://nytbee.com/Bee_{}.html"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
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
    
    def scrape_puzzle_data(self, date_str):
        """
        Scrape puzzle data - handles both modern and historical formats
        """
        formatted_date = date_str.replace("-", "")
        url = self.base_url.format(formatted_date)
        
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            
            if len(response.content) < 50000:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Try modern format first (2025+)
            puzzle_data = self.extract_modern_format(soup, date_str)
            if puzzle_data:
                return puzzle_data
            
            # Fall back to historical format (2022 and earlier)
            puzzle_data = self.extract_historical_format(soup, date_str)
            return puzzle_data
            
        except requests.RequestException as e:
            if "404" in str(e):
                return "NOT_FOUND"
            return None
        except Exception as e:
            return None
    
    def extract_modern_format(self, soup, date_str):
        """
        Extract from modern format (2022+) - words in HTML
        Handles both 2022 simple format and 2025+ complex format
        """
        try:
            answer_list = soup.find("div", {"id": "main-answer-list"})
            if not answer_list:
                return None
            
            answers = []
            pangrams = []
            
            li_tags = answer_list.find_all("li")
            if len(li_tags) < 15:  # Need reasonable number of words
                return None
            
            print(f"   📊 Found {len(li_tags)} words in main-answer-list")
            
            for li in li_tags:
                word = None
                is_pangram = False
                
                # Check for pangram (both formats)
                mark_tag = li.find("mark")
                if mark_tag:
                    strong_tag = mark_tag.find("strong")
                    if strong_tag:
                        word = strong_tag.get_text().strip()
                        is_pangram = True
                
                # If not pangram, try different extraction methods
                if not word:
                    # Try 2025+ format (flex-list-item)
                    flex_div = li.find("div", class_="flex-list-item")
                    if flex_div:
                        word = flex_div.get_text().split("↗")[0].strip()
                    else:
                        # Try 2022 format (simple text)
                        word = li.get_text().strip()
                
                # Clean and validate word
                if word:
                    word = word.lower().strip()
                    if len(word) >= 4 and word.isalpha():
                        answers.append(word)
                        if is_pangram:
                            pangrams.append(word)
            
            print(f"   📋 Extracted {len(answers)} words, {len(pangrams)} pangrams")
            
            if len(answers) > 15:  # Reasonable threshold
                return self.build_puzzle_data(answers, pangrams, date_str)
            
            return None
            
        except Exception as e:
            print(f"   ❌ Error in modern format extraction: {e}")
            return None
    
    def extract_historical_format(self, soup, date_str):
        """
        Extract from historical format (pre-2022) - words in JavaScript/Bokeh data
        
        FIXED: Improved regex pattern and array parsing for nested structures
        """
        try:
            # Look for JavaScript containing word data
            scripts = soup.find_all("script")
            
            for script_idx, script in enumerate(scripts):
                if not script.string:
                    continue
                
                script_text = script.string
                
                # Look for word data in Bokeh format
                if '"words"' in script_text:
                    print(f"   🎯 Found 'words' in script {script_idx + 1}")
                    
                    # FIXED: Extract the complete array by finding matching brackets
                    words_start = script_text.find('"words":')
                    if words_start == -1:
                        continue
                    
                    # Find the opening bracket after "words":
                    bracket_start = script_text.find('[', words_start)
                    if bracket_start == -1:
                        continue
                    
                    # Find the matching closing bracket by counting
                    bracket_count = 0
                    bracket_end = -1
                    for i in range(bracket_start, len(script_text)):
                        if script_text[i] == '[':
                            bracket_count += 1
                        elif script_text[i] == ']':
                            bracket_count -= 1
                            if bracket_count == 0:
                                bracket_end = i
                                break
                    
                    if bracket_end == -1:
                        continue
                    
                    # Extract the complete array content
                    full_array = script_text[bracket_start:bracket_end + 1]
                    print(f"   📊 Extracted array ({len(full_array)} chars)")
                    
                    # Parse nested arrays manually
                    all_words = []
                    potential_pangrams = []
                    
                    # Remove outer brackets and split by "],["
                    inner_content = full_array[1:-1]  # Remove [ and ]
                    
                    # Split arrays by "],["
                    array_parts = inner_content.split('],[')
                    
                    for part_idx, part in enumerate(array_parts):
                        # Clean up the part (remove leading/trailing brackets)
                        clean_part = part.strip()
                        if clean_part.startswith('['):
                            clean_part = clean_part[1:]
                        if clean_part.endswith(']'):
                            clean_part = clean_part[:-1]
                        
                        # Extract words from quotes
                        word_pattern = r'"([^"]+)"'
                        words_in_group = re.findall(word_pattern, clean_part)
                        
                        print(f"   📋 Group {part_idx + 1}: {len(words_in_group)} words")
                        
                        # Add to all words
                        all_words.extend(words_in_group)
                        
                        # Collect longer words as potential pangrams
                        for word in words_in_group:
                            if len(word) >= 7:
                                potential_pangrams.append(word)
                    
                    if len(all_words) > 15:
                        print(f"   ✅ Successfully extracted {len(all_words)} words")
                        
                        # Build puzzle data first to get the valid letters
                        puzzle_data = self.build_puzzle_data(all_words, [], date_str)
                        if puzzle_data:
                            # Now validate pangrams
                            valid_pangrams = self.validate_pangrams(potential_pangrams, puzzle_data['validLetters'])
                            puzzle_data['pangrams'] = valid_pangrams
                            
                            print(f"   🌟 Validated {len(valid_pangrams)} pangrams")
                            return puzzle_data
            
            return None
            
        except Exception as e:
            print(f"   ❌ Error in historical format extraction: {e}")
            return None
    
    def validate_pangrams(self, potential_pangrams, valid_letters):
        """
        Validate which words are actually pangrams by checking if they use all letters
        """
        valid_pangrams = []
        all_letters_set = set(letter.lower() for letter in valid_letters)
        
        for word in potential_pangrams:
            word_letters_set = set(word.lower())
            
            # A pangram must use ALL the valid letters
            if word_letters_set == all_letters_set:
                valid_pangrams.append(word)
            elif len(word_letters_set) == len(all_letters_set):
                # Check if it's close (might have extra letters from poor extraction)
                if all_letters_set.issubset(word_letters_set):
                    # Has all required letters, but might have extras - still valid if reasonable
                    if len(word_letters_set - all_letters_set) <= 1:  # At most 1 extra letter
                        valid_pangrams.append(word)
        
        return valid_pangrams
    
    def build_puzzle_data(self, answers, pangrams, date_str):
        """
        Build puzzle data structure from word list
        
        IMPROVED: Better center letter detection and validation
        """
        try:
            if not answers:
                return None
            
            # Clean and validate words
            cleaned_answers = []
            for word in answers:
                word = word.lower().strip()
                if len(word) >= 4 and word.isalpha():  # Valid spelling bee words
                    cleaned_answers.append(word)
            
            if len(cleaned_answers) < 15:  # Need reasonable number of words
                return None
            
            # Parse date
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            display_date = date_obj.strftime("%B %d, %Y")
            display_weekday = date_obj.strftime("%A")
            
            # Determine center letter (appears in ALL words)
            letter_counts = {}
            for word in cleaned_answers:
                for letter in set(word.lower()):
                    letter_counts[letter] = letter_counts.get(letter, 0) + 1
            
            # Find letter that appears in ALL words
            center_letter = None
            for letter, count in letter_counts.items():
                if count == len(cleaned_answers):
                    center_letter = letter
                    break
            
            if not center_letter:
                print(f"   ❌ Could not determine center letter for {date_str}")
                return None
            
            # Get all unique letters
            all_letters = set()
            for word in cleaned_answers:
                all_letters.update(word.lower())
            
            # Must have exactly 7 letters for a proper spelling bee
            if len(all_letters) != 7:
                print(f"   ❌ Invalid letter count {len(all_letters)} for {date_str}")
                return None
            
            outer_letters = sorted(list(all_letters - {center_letter}))
            valid_letters = [center_letter] + outer_letters
            
            puzzle_id = int(date_obj.timestamp())
            
            puzzle_data = {
                "displayWeekday": display_weekday,
                "displayDate": display_date,
                "printDate": date_str,
                "centerLetter": center_letter,
                "outerLetters": outer_letters,
                "validLetters": valid_letters,
                "pangrams": pangrams,  # Will be set by caller
                "answers": sorted(cleaned_answers),  # Sort for consistency
                "id": puzzle_id,
                "freeExpiration": 0,
                "editor": "Sam Ezersky"
            }
            
            return puzzle_data
            
        except Exception as e:
            print(f"   ❌ Error building puzzle data: {e}")
            return None
    
    def test_single_date(self, date_str):
        """Test scraping a single date for debugging"""
        print(f"🧪 Testing {date_str}...")
        
        puzzle_data = self.scrape_puzzle_data(date_str)
        
        if puzzle_data == "NOT_FOUND":
            print("   ❌ Not found (404)")
        elif puzzle_data:
            print(f"   ✅ SUCCESS!")
            print(f"   📊 {len(puzzle_data['answers'])} words, {len(puzzle_data['pangrams'])} pangrams")
            print(f"   📝 Center: '{puzzle_data['centerLetter']}', Outer: {puzzle_data['outerLetters']}")
            print(f"   🌟 Pangrams: {puzzle_data['pangrams']}")
            print(f"   📋 Sample words: {puzzle_data['answers'][:10]}...")
            if len(puzzle_data['answers']) > 10:
                print(f"   📋 More words: ...{puzzle_data['answers'][-5:]}")
            
            # Validate that all words contain center letter
            center = puzzle_data['centerLetter']
            invalid_words = [word for word in puzzle_data['answers'] if center not in word.lower()]
            if invalid_words:
                print(f"   ⚠️  WARNING: {len(invalid_words)} words don't contain center letter '{center}': {invalid_words}")
            else:
                print(f"   ✅ All words contain center letter '{center}'")
            
            # Save for inspection
            with open(f"test_{date_str}.json", "w") as f:
                json.dump(puzzle_data, f, indent=2)
            print(f"   💾 Saved to test_{date_str}.json")
        else:
            print("   ❌ FAILED to parse")
            
            # Try to give more info about what went wrong
            formatted_date = date_str.replace("-", "")
            url = self.base_url.format(formatted_date)
            try:
                response = requests.get(url, headers=self.headers, timeout=15)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    answer_list = soup.find("div", {"id": "main-answer-list"})
                    if answer_list:
                        li_count = len(answer_list.find_all("li"))
                        print(f"   📊 Found main-answer-list with {li_count} items")
                    else:
                        print(f"   📊 No main-answer-list found, trying historical format...")
                        scripts = soup.find_all("script")
                        words_scripts = [i for i, s in enumerate(scripts) if s.string and '"words"' in s.string]
                        print(f"   📊 Found {len(words_scripts)} scripts with 'words' keyword")
                else:
                    print(f"   📊 HTTP {response.status_code}")
            except Exception as e:
                print(f"   📊 Debug error: {e}")
    
    def save_puzzle(self, puzzle_data, date_str):
        """Save puzzle data to JSON file"""
        file_path = self.data_dir / f"{date_str}.json"
        
        try:
            with open(file_path, 'w') as f:
                json.dump(puzzle_data, f, indent=2)
            return True
        except Exception:
            return False
    
    def scrape_year(self, year):
        """Scrape all missing puzzles for a year"""
        print(f"🐝 Fixed Historical Scraper - Year {year}")
        print("=" * 50)
        
        existing_dates = self.get_existing_dates()
        
        # Generate year dates
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31)
        
        year_dates = []
        current_date = start_date
        while current_date <= end_date:
            year_dates.append(current_date.strftime('%Y-%m-%d'))
            current_date += timedelta(days=1)
        
        missing_dates = [date for date in year_dates if date not in existing_dates]
        
        print(f"📊 Year {year}: {len(missing_dates)} missing dates")
        
        if not missing_dates:
            print("✅ Year is already complete!")
            return
        
        success_count = 0
        error_count = 0
        not_found_count = 0
        
        for i, date_str in enumerate(missing_dates, 1):
            print(f"\n📅 [{i}/{len(missing_dates)}] Processing {date_str}...")
            
            puzzle_data = self.scrape_puzzle_data(date_str)
            
            if puzzle_data == "NOT_FOUND":
                not_found_count += 1
                print(f"   ⚠️  Not available (404)")
            elif puzzle_data:
                if self.save_puzzle(puzzle_data, date_str):
                    success_count += 1
                    print(f"   ✅ Saved ({len(puzzle_data['answers'])} words, {len(puzzle_data['pangrams'])} pangrams)")
                else:
                    error_count += 1
                    print(f"   ❌ Save failed")
            else:
                error_count += 1
                print(f"   ❌ Parse failed")
            
            time.sleep(1)
            
            if i % 20 == 0:
                print(f"\n📊 Progress: {success_count} success, {error_count} errors, {not_found_count} not found")
        
        print(f"\n🎉 Complete! {success_count} success, {error_count} errors, {not_found_count} not found")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Fixed NYTBee Historical Scraper')
    parser.add_argument('year', type=int, help='Year to scrape')
    parser.add_argument('--test', help='Test single date (YYYY-MM-DD)')
    
    args = parser.parse_args()
    
    try:
        scraper = NYTBeeHistoricalScraperFixed()
        
        if args.test:
            scraper.test_single_date(args.test)
        else:
            scraper.scrape_year(args.year)
            
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted")
    except Exception as e:
        print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    main()