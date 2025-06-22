import os
import sys
import requests
from datetime import datetime
from typing import Dict, Any, Optional
import logging
from pathlib import Path
import time

# Add the project root to the Python path
project_root = str(Path(__file__).resolve().parent.parent.parent.parent)
sys.path.insert(0, project_root)

from football_data.endpoints.api_manager import api_manager
from football_data.get_data.api_football.db_mongo import db_manager
from football_data.get_data.api_football.league_id_mappings import LEAGUE_ID_MAPPING

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GameScraper:
    """Class to scrape football games from the API and store them in the optimized MongoDB structure."""
    
    def __init__(self):
        """Initialize the scraper with API configuration."""
        self.base_url = "https://api-football-v1.p.rapidapi.com/v3"
        
        # Get API key from environment variable
        api_key = os.getenv("API_FOOTBALL_KEY")
        if not api_key:
            logger.warning("API_FOOTBALL_KEY environment variable not set, using API manager")
            
        # Load leagues from the mapping file and convert to the format expected by the scraper
        self.all_leagues = {}
        
        # Convert LEAGUE_ID_MAPPING to the format expected by the scraper
        for league_name, league_info in LEAGUE_ID_MAPPING.items():
            league_id = league_info["mongodb_id"]
            
            # Extract country from league name (format: "League Name (Country)")
            if "(" in league_name and ")" in league_name:
                name_part = league_name.split("(")[0].strip()
                country_part = league_name.split("(")[1].split(")")[0].strip()
            else:
                name_part = league_name
                country_part = "Unknown"
            
            # Determine tier based on league name
            tier = 1  # Default to tier 1
            if any(keyword in name_part.lower() for keyword in ["2.", "segunda", "championship", "serie b", "ligue 2", "segunda liga", "eredivisie 2"]):
                tier = 2
            elif any(keyword in name_part.lower() for keyword in ["cup", "conference", "qualification", "friendlies"]):
                tier = 3
            
            self.all_leagues[league_id] = {
                "name": name_part,
                "tier": tier,
                "country": country_part
            }
        
        logger.info(f"Loaded {len(self.all_leagues)} leagues from league_id_mappings.py")
        
        # Debug: Check if FIFA Club World Cup (ID 15) is loaded
        if "15" in self.all_leagues:
            logger.info(f"FIFA Club World Cup (ID 15) is loaded: {self.all_leagues['15']}")
        else:
            logger.warning("FIFA Club World Cup (ID 15) is NOT in all_leagues!")
            logger.debug(f"Available league IDs: {list(self.all_leagues.keys())[:10]}...")
        
       
        
        # Use all_leagues as the meaningful leagues (active leagues)
        self.meaningful_leagues = self.all_leagues.copy()
        
        # List of strings that indicate non-main team matches
        self.excluded_terms = [
            "(w)", "women", "reserves", "u21", "u23", "u20", "u19", "u18", 
            "youth", "academy", "junior", "development"
        ]
        
        logger.info("GameScraper initialized successfully")

    def _make_api_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None, max_retries: int = 4) -> Dict:
        """Make API request with robust error handling and key rotation."""
        url = f"{self.base_url}/{endpoint}"
        if params is None:
            params = {}
        logger.info(f"Making API request to {url}")
        if params:
            logger.debug(f"Params: {params}")
        
        for attempt in range(max_retries):
            try:
                # Get active API key and headers from API manager
                current_key, headers = api_manager.get_active_api_key()
                
                response = requests.get(url, headers=headers, params=params, timeout=15)
                
                # Handle specific HTTP status codes
                if response.status_code == 429:  # Rate limit
                    logger.warning(f"Rate limit hit on key ...{current_key[-4:]}. Rotating. Attempt {attempt + 1}/{max_retries}.")
                    api_manager.handle_rate_limit(current_key)
                    continue
                
                if response.status_code == 403: # Forbidden
                    logger.error(f"Forbidden (403) on key ...{current_key[-4:]}. Rotating. Attempt {attempt + 1}/{max_retries}.")
                    api_manager.handle_fatal_error(current_key)
                    continue

                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.HTTPError as e:
                logger.error(f"HTTP Error on attempt {attempt + 1}/{max_retries}: {str(e)}")
                if e.response.status_code >= 500:
                    time.sleep(1)
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed on attempt {attempt + 1}/{max_retries}: {e}", exc_info=True)
                time.sleep(1)
            except Exception as e:
                logger.error(f"Unexpected error on attempt {attempt + 1}/{max_retries}: {str(e)}", exc_info=True)
                if 'current_key' in locals():
                    api_manager.handle_fatal_error(current_key)
                time.sleep(1)

        logger.critical(f"API request to {url} failed after {max_retries} retries.")
        return {"status": "failed", "message": f"API request failed after {max_retries} retries."}

    def get_active_leagues_for_date(self, date: datetime) -> Dict:
        """Get the active leagues for a specific date."""
        # Simply return all meaningful leagues since we're not using a schedule
        return self.meaningful_leagues

    def _is_valid_match(self, match: Dict) -> bool:
        """Check if a match should be included based on team names, competition, and league."""
        # Get team names and league info
        home_team = match.get("teams", {}).get("home", {}).get("name", "").lower()
        away_team = match.get("teams", {}).get("away", {}).get("name", "").lower()
        league = match.get("league", {})
        league_id = str(league.get("id", ""))
        league_name = league.get("name", "")
        
        # Check for excluded terms in team names
        for term in self.excluded_terms:
            if term in home_team or term in away_team:
                logger.debug(f"Match excluded due to team name filter: {home_team} vs {away_team} (term: {term})")
                return False
        
        # Only accept leagues from our mapping
        if league_id in self.all_leagues:
            logger.debug(f"Match accepted (priority league): {home_team} vs {away_team} in {league_name} (ID: {league_id})")
            return True
        else:
            # Exclude leagues not in our mapping
            logger.debug(f"Match excluded (league not in mapping): {home_team} vs {away_team} in {league_name} (ID: {league_id})")
            # Special debug for FIFA Club World Cup
            if league_id == "15":
                logger.warning(f"FIFA Club World Cup match excluded! Available IDs: {list(self.all_leagues.keys())[:5]}...")
            return False

    def _fetch_standings(self, league_id: str, season: int, date_str: str) -> Dict:
        """Fetch standings for a specific league and season."""
        logger.info(f"Fetching standings for league {league_id}, season {season}")
        
        response = self._make_api_request(
            'standings',
            {
                "league": league_id,
                "season": season
            }
        )
        
        if not response or "response" not in response or not response["response"]:
            logger.warning(f"No standings found for league {league_id}, season {season}")
            return {}
        
        standings_data = response["response"][0]
        
        # Optimize standings data structure
        optimized_standings = {
            "league": {
                "id": str(standings_data.get("league", {}).get("id", "")),
                "name": standings_data.get("league", {}).get("name", ""),
                "country": standings_data.get("league", {}).get("country", ""),
                "season": season
            },
            "standings": []
        }
        
        # Extract only necessary standings data
        for league_standings in standings_data.get("league", {}).get("standings", []):
            standings_group = []
            for team in league_standings:
                optimized_team = {
                    "rank": team.get("rank", 0),
                    "team": {
                        "id": str(team.get("team", {}).get("id", "")),
                        "name": team.get("team", {}).get("name", "")
                    },
                    "points": team.get("points", 0),
                    "goalsDiff": team.get("goalsDiff", 0),
                    "form": team.get("form", ""),
                    "all": {
                        "played": team.get("all", {}).get("played", 0),
                        "win": team.get("all", {}).get("win", 0),
                        "draw": team.get("all", {}).get("draw", 0),
                        "lose": team.get("all", {}).get("lose", 0),
                        "goals": team.get("all", {}).get("goals", {})
                    }
                }
                standings_group.append(optimized_team)
            optimized_standings["standings"].append(standings_group)
        
        # Save standings data to MongoDB
        db_manager.save_standings_data(date_str, league_id, season, optimized_standings)
        
        return optimized_standings
    def get_games(self, date: datetime) -> Dict:
        """Get games for a specific date and save in the optimized structure."""
        try:
            api_date = date.strftime('%Y-%m-%d')
            logger.info(f"Fetching matches for {api_date}")
            
            # Initialize organized data structure
            organized_data = {
                "date": api_date,
                "total_matches": 0,
                "leagues": {}
            }
            
            # Determine the correct season based on the date
            # Football seasons typically run from August to May/July
            # However, some tournaments like FIFA Club World Cup follow their own schedule
            current_year = date.year
            current_month = date.month
            
            # Special handling for FIFA Club World Cup 2025 (June 15-27, 2025)
            if (current_year == 2025 and current_month == 6 and 
                15 <= date.day <= 27):
                season = 2025  # FIFA Club World Cup 2025 uses season 2025
                logger.info(f"Using season 2025 for FIFA Club World Cup dates")
            elif current_year == 2025:
                if current_month <= 7:  # Jan-July 2025 = 2024-25 season (except FIFA CWC)
                    season = 2024
                else:  # Aug-Dec 2025 = 2025-26 season
                    season = 2025
            else:
                # Standard logic for other years
                if current_month <= 7:
                    season = current_year - 1
                else:
                    season = current_year
            
            # Fetch all matches for the date
            response = self._make_api_request(
                'fixtures',
                {
                    "date": api_date,
                    "season": season
                }
            )
            
            if not response or "response" not in response:
                logger.warning(f"No matches found or API error for {api_date}")
                return organized_data
            
            matches = response["response"]
            logger.info(f"Found {len(matches)} total matches")
            
            # Process matches
            filtered_count = 0
            total_processed = 0
            standings_cache = {}  # Cache standings to avoid duplicate API calls
            
            for match in matches:
                total_processed += 1
                if not self._is_valid_match(match):
                    # Log why match was filtered out for debugging
                    league_id = str(match.get("league", {}).get("id", ""))
                    home_team = match.get("teams", {}).get("home", {}).get("name", "")
                    away_team = match.get("teams", {}).get("away", {}).get("name", "")
                    logger.debug(f"Filtered out match: {home_team} vs {away_team} (League ID: {league_id})")
                    continue
                
                league = match["league"]
                league_id = str(league["id"])
                
                # Try to get league info from our predefined list
                active_leagues = self.get_active_leagues_for_date(date)
                if league_id in active_leagues:
                    league_info = active_leagues[league_id]
                else:
                    # If league not in our list, create basic info from match data
                    logger.info(f"League {league_id} ({league['name']}) not in predefined list, adding dynamically")
                    league_info = {
                        "id": int(league_id),
                        "name": league["name"],
                        "country": league.get("country", "Unknown"),
                        "tier": 3,  # Default tier for unknown leagues
                        "season": season
                    }
                
                league_name = f"{league_info['name']} ({league_info['country']})"
                
                # Initialize league data if not exists
                if league_id not in organized_data["leagues"]:
                    organized_data["leagues"][league_id] = {
                        "name": league_name,
                        "country": league_info["country"],
                        "tier": league_info["tier"],
                        "matches": []
                    }
                
                # Create match data with minimal required info
                match_data = {
                    "id": str(match["fixture"]["id"]),
                    "time": match["fixture"]["date"],
                    "home_team": {
                        "id": str(match["teams"]["home"]["id"]),
                        "name": match["teams"]["home"]["name"]
                    },
                    "away_team": {
                        "id": str(match["teams"]["away"]["id"]),
                        "name": match["teams"]["away"]["name"]
                    },
                    "status": {
                        "started": match["fixture"]["status"]["short"] in ["1H", "2H", "HT", "ET", "P", "BT", "INT"],
                        "finished": match["fixture"]["status"]["short"] in ["FT", "AET", "PEN"],
                        "score": f"{match['goals']['home'] if match['goals']['home'] is not None else 0} - {match['goals']['away'] if match['goals']['away'] is not None else 0}",
                        "time": match["fixture"]["status"]["short"]
                    }
                }
                
                organized_data["leagues"][league_id]["matches"].append(match_data)
                organized_data["total_matches"] += 1
                filtered_count += 1
                
                # Fetch standings for this league if not already in cache
                if league_id not in standings_cache:
                    standings_cache[league_id] = self._fetch_standings(league_id, season, api_date)
                
                # Prepare detailed match data for the matches collection
                fixture_id = str(match["fixture"]["id"])
                # Extract date in YYYY-MM-DD format from fixture date
                match_date_str = match["fixture"]["date"].split("T")[0] if match["fixture"]["date"] else api_date
                
                detailed_match = {
                    "_id": fixture_id,
                    "fixture_id": fixture_id,  # Add this for consistency
                    "date_str": match_date_str,  # Add the date_str field
                    "league_id": league_id,
                    "league_name": league_name,
                    "home_team": {
                        "id": str(match["teams"]["home"]["id"]),
                        "name": match["teams"]["home"]["name"],
                        "logo": match["teams"]["home"].get("logo", "")
                    },
                    "away_team": {
                        "id": str(match["teams"]["away"]["id"]),
                        "name": match["teams"]["away"]["name"],
                        "logo": match["teams"]["away"].get("logo", "")
                    },
                    "match_info": {
                        "id": fixture_id,
                        "referee": match["fixture"].get("referee", ""),
                        "venue": {
                            "name": match["fixture"].get("venue", {}).get("name", ""),
                            "city": match["fixture"].get("venue", {}).get("city", "")
                        },
                        "status": match["fixture"]["status"],
                        "date": match["fixture"]["date"],
                        "timestamp": match["fixture"].get("timestamp", 0)
                    },
                    "goals": match["goals"],
                    "standings": standings_cache.get(league_id, {})
                }
                
                # Save detailed match data
                db_manager.save_match_data(detailed_match)
            
            # Print summary
            logger.info(f"Processed {total_processed} total matches, {filtered_count} passed filters, {total_processed - filtered_count} filtered out")
            if organized_data["total_matches"] > 0:
                logger.info(f"Found {filtered_count} meaningful matches in {len(organized_data['leagues'])} leagues")
                for league_id, league_data in organized_data["leagues"].items():
                    logger.info(f"{league_data['name']} (Tier {league_data['tier']}) - {len(league_data['matches'])} matches")
            else:
                logger.warning(f"No meaningful matches found for date {api_date}")
            
            # Always save daily games summary to MongoDB (even if no matches found)
            logger.info(f"Saving {api_date} games data to MongoDB (total matches: {organized_data['total_matches']})...")
            try:
                success = db_manager.save_daily_games(api_date, organized_data)
                if success:
                    logger.info(f"Daily games data for {api_date} saved successfully to MongoDB")
                else:
                    logger.error(f"Failed to save daily games data for {api_date} to MongoDB")
            except Exception as db_e:
                logger.error(f"Error saving games data to MongoDB: {db_e}")
            
            return organized_data
            
        except Exception as e:
            logger.error(f"Error in get_games: {str(e)}", exc_info=True)
            return {"date": date.strftime('%Y-%m-%d'), "total_matches": 0, "leagues": {}, "error": str(e)}

# Main function for testing
def main():
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    
    # Create scraper
    scraper = GameScraper()
    
    # Get games for today
    today = datetime.now()
    games = scraper.get_games(today)
    
    print(f"Total matches: {games['total_matches']}")
    
if __name__ == "__main__":
    main() 