import logging
from datetime import datetime
from typing import List, Dict, Any
import asyncio
import argparse
import sys
import os
import json
from pathlib import Path

# --- Path setup ---
# Add the project root to the Python path to allow for absolute imports
project_root = str(Path(__file__).resolve().parents[2])  # Go up 2 levels to reach alpha_steam
football_data_root = str(Path(__file__).resolve().parents[1])  # Go up 1 level to reach football_data

if project_root not in sys.path:
    sys.path.insert(0, project_root)
if football_data_root not in sys.path:
    sys.path.insert(0, football_data_root)

# Now that the path is set, we can perform the imports
try:
    from football_data.get_data.api_football.db_mongo import MongoDBManager
    from football_data.endpoints.odds_fetcher import OddsFetcher
    from football_data.endpoints.api_manager import api_manager
    from football_data.endpoints.fixture_details import FixtureDetailsFetcher
    from football_data.endpoints.match_processor import MatchProcessor
except ImportError as e:
    print(f"Error during module import: {e}")
    print("Please ensure the script is run from a location where 'football_data' is accessible,")
    print("or that the project structure is correct.")
    sys.exit(1)


logger = logging.getLogger(__name__)

# Directory to save the final unified data
UNIFIED_DATA_DIR = os.path.join(football_data_root, "data", "unified_data")


class DailyDataPreparer:
    """
    Orchestrates the daily data preparation process:
    1. Extracts fixture IDs for a given date.
    2. Fetches detailed stats for each fixture.
    3. Processes and combines all data.
    4. Saves the final unified data to a JSON file.
    """

    def __init__(self):
        """Initialize the DailyDataPreparer."""
        logger.info("DailyDataPreparer initialized")
        if not api_manager.is_initialized():
            api_manager.initialize()
        
        # Initialize database manager
        self.db_manager = MongoDBManager()
        
        # We need these components to process the data
        self.fixture_details_fetcher = FixtureDetailsFetcher(db_manager_instance=self.db_manager)
        self.match_processor = MatchProcessor()
        # Set OUTPUT_DIR for compatibility with pipeline files
        self.OUTPUT_DIR = UNIFIED_DATA_DIR

    def extract_fixture_ids_for_date(self, date_str: str) -> List[int]:
        """
        Extracts all fixture IDs for a specific date from the 'daily_games' collection.
        """
        logger.info(f"Extracting fixture IDs for date: {date_str}")
        try:
            games_data = self.db_manager.get_daily_games(date_str)

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

    async def prepare_data_for_date(self, date_str: str, force_reprocess: bool = False):
        """
        Main orchestration method to prepare all data for a given date.
        """
        logger.info(f"--- Starting Daily Data Preparation for {date_str} ---")
        
        # Ensure the output directory exists
        os.makedirs(UNIFIED_DATA_DIR, exist_ok=True)

        # Step 1: Extract fixture IDs
        fixture_ids = self.extract_fixture_ids_for_date(date_str)

        if not fixture_ids:
            logger.warning(f"No fixtures to process for {date_str}.")
            return

        processed_count = 0
        skipped_count = 0
        failed_count = 0

        # Step 2: Process each fixture
        for fixture_id in fixture_ids:
            output_path = os.path.join(UNIFIED_DATA_DIR, f"unified_fixture_{fixture_id}.json")
            
            # Skip if already processed unless force is True
            if os.path.exists(output_path) and not force_reprocess:
                logger.info(f"Skipping fixture {fixture_id}; unified file already exists.")
                skipped_count += 1
                continue

            logger.info(f"--- Processing fixture {fixture_id} ---")
            try:
                # Step 2a: Fetch and save fixture details (H2H, stats, etc.)
                processed_data = self.fixture_details_fetcher.get_fixture_details(fixture_id=fixture_id)

                # Step 2c: Save the final document to a file
                if processed_data:
                    # Custom JSON encoder to handle datetime objects
                    class DateTimeEncoder(json.JSONEncoder):
                        def default(self, obj):
                            if isinstance(obj, datetime):
                                return obj.isoformat()
                            return super(DateTimeEncoder, self).default(obj)
                    
                    with open(output_path, 'w') as f:
                        json.dump(processed_data, f, indent=4, cls=DateTimeEncoder)
                    logger.info(f"Successfully saved unified data for fixture {fixture_id} to {output_path}")
                    processed_count += 1
                else:
                    logger.error(f"FixtureDetailsFetcher returned no data for fixture {fixture_id}.")
                    failed_count += 1

            except Exception as e:
                logger.error(f"An unexpected error occurred while processing fixture {fixture_id}: {e}", exc_info=True)
                failed_count += 1
        
        logger.info("--- DATA PREPARATION SUMMARY ---")
        logger.info(f"Date Processed         : {date_str}")
        logger.info(f"Successfully processed : {processed_count}")
        logger.info(f"Skipped (already exist): {skipped_count}")
        logger.info(f"Failed fixtures        : {failed_count}")
        logger.info("----------------------------------")

    def _sanitize_filename(self, name: str) -> str:
        """
        Sanitize a team name for use in filenames.
        """
        if not name:
            return "Unknown"
        # Remove or replace characters that are problematic in filenames
        import re
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', name)
        sanitized = re.sub(r'\s+', '_', sanitized)  # Replace spaces with underscores
        return sanitized.strip('_')

    async def extract_games(self, target_date: datetime) -> Dict[str, Any]:
        """
        Legacy method for compatibility with pipeline files.
        Calls prepare_data_for_date internally.
        """
        date_str = target_date.strftime('%Y-%m-%d')
        logger.info(f"extract_games called for {date_str} (compatibility mode)")
        
        # Call the main method
        await self.prepare_data_for_date(date_str, force_reprocess=False)
        
        # Return a summary in the format expected by pipeline files
        fixture_ids = self.extract_fixture_ids_for_date(date_str)
        
        games_processed_summary = []
        for fixture_id in fixture_ids:
            output_path = os.path.join(UNIFIED_DATA_DIR, f"unified_fixture_{fixture_id}.json")
            if os.path.exists(output_path):
                games_processed_summary.append({
                    "fixture_id": fixture_id,
                    "status": "processed",
                    "file_path": output_path
                })
        
        return {
            "games_processed_summary": games_processed_summary,
            "total_fixtures": len(fixture_ids),
            "processed_fixtures": len(games_processed_summary)
        }


async def main():
    """Main function to run the daily game and odds extraction process."""
    parser = argparse.ArgumentParser(description='Prepare daily match data for prediction.')
    parser.add_argument(
        '--date',
        type=str,
        default=datetime.now().strftime("%Y-%m-%d"),
        help='Date in YYYY-MM-DD format. Defaults to today.'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force reprocessing of fixture data even if it already exists in the database or as a file.'
    )
    args = parser.parse_args()

    # Basic logging setup
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(module)s - %(message)s')

    preparer = DailyDataPreparer()
    try:
        await preparer.prepare_data_for_date(
            date_str=args.date,
            force_reprocess=args.force
        )
    except Exception as e:
        logger.critical(f"A critical error occurred in the main execution block: {e}", exc_info=True)
    finally:
        preparer.db_manager.close_connection()
        logger.info("MongoDB connection closed.")


if __name__ == "__main__":
    asyncio.run(main()) 