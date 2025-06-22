import os
import requests
from datetime import datetime
from typing import Dict,Any, Optional
import logging
import time
from football_data.endpoints.api_manager import api_manager
from football_data.get_data.api_football.db_mongo import db_manager, MongoDBManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FixtureDetailsFetcher:
    """Class to fetch detailed information for specific fixtures from the API Football."""
    
    def __init__(self, db_manager_instance: MongoDBManager):
        """Initialize the fetcher with API configuration and DB manager."""
        self.base_url = "https://api-football-v1.p.rapidapi.com/v3"
        
        # Get API key from environment variable
        api_key = os.getenv("API_FOOTBALL_KEY")
        if not api_key:
            logger.warning("API_FOOTBALL_KEY environment variable not set, using API manager")
            
        self.api_manager = api_manager
        self.db_manager = db_manager_instance
        
        logger.info("FixtureDetailsFetcher initialized successfully")

    def _make_api_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None, max_retries: int = 4) -> Dict:
        """Make API request with robust error handling and key rotation."""
        url = f"{self.base_url}/{endpoint}"
        if params is None:
            params = {}
        logger.info(f"Making API request to {url}")
        
        for attempt in range(max_retries):
            try:
                # Get active API key and headers from API manager
                current_key, headers = self.api_manager.get_active_api_key()
                
                response = requests.get(url, headers=headers, params=params, timeout=15)
                
                # Handle specific HTTP status codes
                if response.status_code == 429:  # Rate limit
                    logger.warning(f"Rate limit hit on key ...{current_key[-4:]}. Rotating. Attempt {attempt + 1}/{max_retries}.")
                    self.api_manager.handle_rate_limit(current_key)
                    continue  # Retry with a new key after a potential wait
                
                if response.status_code == 403: # Forbidden
                    logger.error(f"Forbidden (403) on key ...{current_key[-4:]}. This key is likely invalid or unsubscribed. Rotating. Attempt {attempt + 1}/{max_retries}.")
                    self.api_manager.handle_fatal_error(current_key)
                    continue # Immediately retry with a different key

                response.raise_for_status()  # Raise HTTPError for other bad responses (4xx or 5xx)
                return response.json()
                
            except requests.exceptions.HTTPError as e:
                logger.error(f"HTTP Error on attempt {attempt + 1}/{max_retries}: {str(e)}")
                # For server errors (5xx), a small delay before retrying might be good.
                if e.response.status_code >= 500:
                    time.sleep(1)
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed on attempt {attempt + 1}/{max_retries}: {e}", exc_info=True)
                time.sleep(1) # Wait a bit before retrying on connection errors etc.
            except Exception as e:
                logger.error(f"Unexpected error on attempt {attempt + 1}/{max_retries}: {str(e)}", exc_info=True)
                # Force rotation on any unexpected error during request, as it might be key-related
                if 'current_key' in locals():
                    self.api_manager.handle_fatal_error(current_key)
                time.sleep(1)

        logger.critical(f"API request to {url} failed after {max_retries} retries.")
        return {"status": "failed", "message": f"API request failed after {max_retries} retries."}

    def get_fixture_details(self, fixture_id: int, match_date: Optional[datetime] = None, season: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Fetch detailed information for a specific fixture.
        
        Args:
            fixture_id (int): The ID of the fixture to fetch details for
            match_date (Optional[datetime]): The date of the match.
            season (Optional[int]): The season of the match.

        Returns:
            Optional[Dict[str, Any]]: Dictionary containing fixture details or None if failed
        """
        try:
            # Prepare request parameters
            params = {"id": fixture_id}

            if season:
                params['season'] = season

            # Get basic fixture information
            logger.info(f"Fetching basic info for fixture {fixture_id}")
            basic_info_response = self._make_api_request("fixtures", params)
            basic_info = basic_info_response.get('response', [])
            
            if not basic_info:
                logger.warning(f"No basic info found for fixture {fixture_id}")
                return None

            match_info_data = basic_info[0]
            
            # Get statistics
            logger.info(f"Fetching statistics for fixture {fixture_id}")
            statistics_response = self._make_api_request("fixtures/statistics", {"fixture": fixture_id})
            statistics = statistics_response.get('response', [])
            
            # Get events
            logger.info(f"Fetching events for fixture {fixture_id}")
            events_response = self._make_api_request("fixtures/events", {"fixture": fixture_id})
            events = events_response.get('response', [])
            
            # Get lineups
            logger.info(f"Fetching lineups for fixture {fixture_id}")
            lineups_response = self._make_api_request("fixtures/lineups", {"fixture": fixture_id})
            lineups = lineups_response.get('response', [])

            # Combine all data into a structure similar to the desired one
            complete_data = {
                '_id': str(fixture_id),
                'fixture_id': str(fixture_id),
                'date_str': match_date.strftime('%Y-%m-%d') if match_date else datetime.fromisoformat(match_info_data['fixture']['date'].replace('Z', '+00:00')).strftime('%Y-%m-%d'),
                'date_utc': datetime.fromisoformat(match_info_data['fixture']['date'].replace('Z', '+00:00')),
                'league_id': match_info_data['league']['id'],
                'league_name': match_info_data['league']['name'],
                'league_country': match_info_data['league']['country'],
                'season': match_info_data['league']['season'],
                'home_team_id': match_info_data['teams']['home']['id'],
                'home_team_name': match_info_data['teams']['home']['name'],
                'away_team_id': match_info_data['teams']['away']['id'],
                'away_team_name': match_info_data['teams']['away']['name'],
                'home_goals': match_info_data['goals']['home'],
                'away_goals': match_info_data['goals']['away'],
                'score_halftime': match_info_data['score']['halftime'],
                'score_fulltime': match_info_data['score']['fulltime'],
                'status_long': match_info_data['fixture']['status']['long'],
                'status_short': match_info_data['fixture']['status']['short'],
                'fixture_details': match_info_data,
                'statistics_full': statistics,
                'events': events,
                'lineups': lineups,
                'last_updated': datetime.utcnow().isoformat()
            }
            
            # Save to database using the db_manager's save_match_data method
            success = self.db_manager.save_match_data(complete_data)
            if success:
                logger.info(f"Successfully saved details for fixture {fixture_id}")
            else:
                logger.warning(f"Failed to save details for fixture {fixture_id}")
            
            return complete_data
            
        except Exception as e:
            logger.error(f"Error fetching fixture details for {fixture_id}: {str(e)}")
            return None

def main():
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    fetcher = FixtureDetailsFetcher(db_manager_instance=db_manager)
    # Example usage
    # fetcher.get_fixture_details(fixture_id=710815)

if __name__ == "__main__":
    main()