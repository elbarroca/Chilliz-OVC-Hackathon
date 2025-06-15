import logging
from datetime import datetime
from typing import List, Dict, Any
import asyncio
import argparse
import sys
from pathlib import Path

# --- Path setup ---
# Add the project root to the Python path to allow for absolute imports
project_root = str(Path(__file__).resolve().parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Now that the path is set, we can perform the imports
try:
    from get_data.api_football.db_mongo import db_manager
    from endpoints.odds_fetcher import OddsFetcher
    from endpoints.api_manager import api_manager
except ImportError as e:
    print(f"Error during module import: {e}")
    print("Please ensure the script is run from a location where 'football_data' is accessible,")
    print("or that the project structure is correct.")
    sys.exit(1)


logger = logging.getLogger(__name__)

class DailyGameExtractor:
    """Extracts daily games data and triggers odds fetching."""

    def __init__(self):
        """Initialize the DailyGameExtractor."""
        logger.info("DailyGameExtractor initialized")
        # Initialize API manager before using it
        if not api_manager.is_initialized():
            api_manager.initialize()
        self.odds_fetcher = OddsFetcher(api_manager=api_manager)

    def extract_fixture_ids_for_date(self, date_str: str) -> List[int]:
        """
        Extracts all fixture IDs for a specific date from the database.
        """
        logger.info(f"Extracting fixture IDs for date: {date_str}")
        try:
            games_data = db_manager.get_daily_games(date_str)

            if not games_data or not games_data.get("leagues"):
                logger.warning(f"No games data found in MongoDB for date {date_str}")
                return []

            fixture_ids = []

            for league_id, league_info in games_data.get("leagues", {}).items():
                for match in league_info.get("matches", []):
                    fixture_id = match.get("id")
                    if fixture_id:
                        try:
                            fixture_ids.append(int(fixture_id))
                        except (ValueError, TypeError):
                            logger.warning(f"Could not convert fixture ID '{fixture_id}' to int. Skipping.")

            unique_fixture_ids = sorted(list(set(fixture_ids)))
            logger.info(f"Found {len(unique_fixture_ids)} unique fixture IDs for {date_str}.")
            return unique_fixture_ids

        except Exception as e:
            logger.error(f"Error getting fixtures from MongoDB: {e}", exc_info=True)
            return []

    async def process_daily_games_and_odds(self, date_str: str, force_reprocess_odds: bool = False) -> Dict[str, Any]:
        """
        Extracts games for a date, fetches their odds, and saves them.
        This is the main orchestration method for daily processing.
        """
        logger.info(f"--- Starting Daily Game and Odds Processing for {date_str} ---")

        # Step 1: Extract fixture IDs
        fixture_ids = self.extract_fixture_ids_for_date(date_str)

        if not fixture_ids:
            logger.warning(f"No fixtures to process for {date_str}.")
            return {"processed_count": 0, "skipped_count": 0, "failed_fixtures": []}

        # Step 2: Fetch and save odds for the extracted fixtures
        logger.info(f"Triggering odds fetching for {len(fixture_ids)} fixtures...")
        odds_results = await self.odds_fetcher.process_fixtures_odds(
            fixture_ids=fixture_ids,
            force_reprocess=force_reprocess_odds
        )

        logger.info(f"--- Finished Daily Game and Odds Processing for {date_str} ---")
        return odds_results

async def main():
    """Main function to run the daily game and odds extraction process."""
    parser = argparse.ArgumentParser(description='Extract daily games and fetch their odds.')
    parser.add_argument(
        '--date',
        type=str,
        default=datetime.now().strftime("%Y-%m-%d"),
        help='Date in YYYY-MM-DD format. Defaults to today.'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force reprocessing of odds even if they already exist in the database.'
    )
    args = parser.parse_args()

    # Basic logging setup
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(module)s - %(message)s')

    extractor = DailyGameExtractor()
    try:
        results = await extractor.process_daily_games_and_odds(
            date_str=args.date,
            force_reprocess_odds=args.force
        )
        logger.info("--- ODDS FETCHING SUMMARY ---")
        logger.info(f"Date Processed : {args.date}")
        logger.info(f"Successfully processed: {results.get('processed_count', 0)}")
        logger.info(f"Skipped (already exist): {results.get('skipped_count', 0)}")
        logger.info(f"Failed fixtures: {len(results.get('failed_fixtures', []))}")
        if results.get('failed_fixtures'):
            logger.warning(f"Failed Fixture IDs: {results['failed_fixtures']}")
        logger.info("-----------------------------")

    except Exception as e:
        logger.critical(f"A critical error occurred in the main execution block: {e}", exc_info=True)
    finally:
        db_manager.close_connection()
        logger.info("MongoDB connection closed.")


if __name__ == "__main__":
    asyncio.run(main()) 