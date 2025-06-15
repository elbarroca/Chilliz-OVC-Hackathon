import asyncio
import logging
from datetime import datetime, timedelta
import os
import sys
from pathlib import Path
import json

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Load .env from parent directory (project root)
    env_path = Path(__file__).resolve().parent.parent / '.env'
    load_dotenv(env_path)
    print("✓ Environment variables loaded from .env file")
except ImportError:
    print("⚠ python-dotenv not installed, trying to load .env manually")
    # Manual .env loading
    env_path = Path(__file__).resolve().parent.parent / '.env'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value.strip('"\'')
        print("✓ Environment variables loaded manually from .env file")
    else:
        print("⚠ .env file not found")

print("=== PIPELINE STARTING ===")
print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")

# Set MONGODB_URI if it's not set but MONGO_URI is
if not os.getenv('MONGODB_URI') and os.getenv('MONGO_URI'):
    os.environ['MONGODB_URI'] = os.getenv('MONGO_URI')
    print("✓ Set MONGODB_URI from MONGO_URI")

# Check environment variables
print(f"API_FOOTBALL_KEY: {'SET' if os.getenv('API_FOOTBALL_KEY') else 'NOT SET'}")
print(f"MONGODB_URI: {'SET' if os.getenv('MONGODB_URI') else 'NOT SET'}")
print(f"MONGO_URI: {'SET' if os.getenv('MONGO_URI') else 'NOT SET'}")
print(f"DB_NAME: {os.getenv('DB_NAME', 'NOT SET')}")

# Add project root to system path
project_root = str(Path(__file__).resolve().parent.parent)
sys.path.insert(0, project_root)
print(f"Added to Python path: {project_root}")

try:
    from football_data.endpoints.game_scraper import GameScraper
    print("✓ GameScraper imported successfully")
except Exception as e:
    print(f"✗ Failed to import GameScraper: {e}")
    sys.exit(1)

try:
    from football_data.endpoints.match_processor import MatchProcessor
    print("✓ MatchProcessor imported successfully")
except Exception as e:
    print(f"✗ Failed to import MatchProcessor: {e}")
    sys.exit(1)

try:
    from football_data.score_data.extract_daily_games import DailyGameExtractor
    print("✓ DailyGameExtractor imported successfully")
except Exception as e:
    print(f"✗ Failed to import DailyGameExtractor: {e}")
    sys.exit(1)

try:
    from football_data.score_data.predict_games import process_fixture_json
    print("✓ process_fixture_json imported successfully")
except Exception as e:
    print(f"✗ Failed to import process_fixture_json: {e}")
    sys.exit(1)

try:
    from football_data.score_data.paper_generator import generate_papers
    print("✓ generate_papers imported successfully")
except Exception as e:
    print(f"✗ Failed to import generate_papers: {e}")
    sys.exit(1)

try:
    from football_data.get_data.api_football.db_mongo import db_manager
    print("✓ db_manager imported successfully")
except Exception as e:
    print(f"✗ Failed to import db_manager: {e}")
    sys.exit(1)

try:
    from football_data.endpoints.fixture_details import FixtureDetailsFetcher
    print("✓ FixtureDetailsFetcher imported successfully")
except Exception as e:
    print(f"✗ Failed to import FixtureDetailsFetcher: {e}")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('pipeline.log')
    ]
)
logger = logging.getLogger(__name__)

print("=== ALL IMPORTS SUCCESSFUL ===")


async def run_match_processing_for_fixture(match_processor, fixture_data):
    """
    Asynchronously processes a single fixture to:
    1. Fetch and store detailed fixture data (events, stats, lineups).
    2. Fetch and store processed data (predictions, team stats, standings).
    3. Fetch and store historical matches for each team.
    """
    try:
        fixture_id = int(fixture_data['fixture_id'])
        league_id = int(fixture_data['league_id'])
        home_team_id = int(fixture_data['home_team']['id'])
        away_team_id = int(fixture_data['away_team']['id'])
        home_team_name = fixture_data['home_team']['name']
        away_team_name = fixture_data['away_team']['name']
        match_date = datetime.fromisoformat(fixture_data['match_info']['date'].replace('Z', '+00:00'))
        season = int(fixture_data['league']['season'])

        logger.info(f"Processing fixture ID: {fixture_id}")

        # 1. Fetch and save detailed fixture info
        fixture_details_fetcher = FixtureDetailsFetcher(db_manager_instance=db_manager)
        fixture_details_fetcher.get_fixture_details(fixture_id)
        
        # 2. Fetch all data for the match from MatchProcessor
        api_data = await match_processor.fetch_api_data_for_match(
            fixture_id=fixture_id,
            league_id=league_id,
            season=season,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            home_team_name=home_team_name,
            away_team_name=away_team_name,
            match_date=match_date
        )

        if api_data:
            # 3. Fetch historical matches for both teams
            logger.info(f"Fetching historical data for fixture {fixture_id}...")
            home_history = db_manager.get_historical_matches(home_team_id, match_date, limit=15)
            away_history = db_manager.get_historical_matches(away_team_id, match_date, limit=15)
            
            api_data['home_team_history'] = home_history
            api_data['away_team_history'] = away_history
            
            logger.info(f"Found {len(home_history)} historical matches for home team {home_team_id}.")
            logger.info(f"Found {len(away_history)} historical matches for away team {away_team_id}.")
            
            # 4. Save the combined processed data to MongoDB
            db_manager.save_match_processor_data(fixture_id, api_data)
            logger.info(f"Successfully processed and saved all data for fixture {fixture_id}.")
            return fixture_id
        else:
            logger.warning(f"No API data returned from MatchProcessor for fixture {fixture_id}.")
            return None
    except Exception as e:
        logger.error(f"Error processing fixture {fixture_data.get('fixture_id', 'N/A')}: {e}", exc_info=True)
        return None


async def main():
    """Main orchestration function."""
    
    # --- 1. Scrape Games ---
    logger.info("--- Step 1: Scraping upcoming games ---")
    scraper = GameScraper()
    all_new_fixture_ids = set()

    for i in range(2): # Today and tomorrow
        target_date = datetime.now() + timedelta(days=i)
        date_str = target_date.strftime('%Y-%m-%d')
        logger.info(f"Scraping games for {date_str}")
        
        # This function saves games to DB and returns the organized data
        scraper.get_games(target_date)
        
        # Get fixture IDs that were just scraped for this date
        new_ids = db_manager.get_match_fixture_ids_for_date(date_str)
        if new_ids:
            all_new_fixture_ids.update(new_ids)

    if not all_new_fixture_ids:
        logger.info("No new fixtures found to process. Exiting.")
        return

    logger.info(f"Found {len(all_new_fixture_ids)} new fixtures to process: {all_new_fixture_ids}")

    # --- 2. Process Each Match ---
    logger.info("\n--- Step 2: Fetching detailed data for each new fixture ---")
    match_processor = MatchProcessor()
    processed_fixture_ids = []
    
    # Create tasks for all new fixtures
    tasks = []
    for fixture_id in all_new_fixture_ids:
        # Fetch the basic match data we stored during scraping
        match_data_from_db = db_manager.get_match_data(str(fixture_id))
        if match_data_from_db:
             # Add league season for match processor
            if 'league' not in match_data_from_db:
                match_data_from_db['league'] = {}
            if 'season' not in match_data_from_db['league']:
                 # Find season from standings if available
                if 'standings' in match_data_from_db and 'league' in match_data_from_db['standings']:
                     match_data_from_db['league']['season'] = match_data_from_db['standings']['league'].get('season', datetime.now().year)
                else:
                    match_data_from_db['league']['season'] = datetime.now().year

            tasks.append(run_match_processing_for_fixture(match_processor, match_data_from_db))
        else:
            logger.warning(f"Could not retrieve basic data for fixture {fixture_id} from DB. Skipping.")

    # Run all processing tasks concurrently
    results = await asyncio.gather(*tasks)
    processed_fixture_ids = [fid for fid in results if fid is not None]
    
    logger.info(f"Successfully processed {len(processed_fixture_ids)} fixtures.")

    if not processed_fixture_ids:
        logger.info("No fixtures were successfully processed. Exiting.")
        return

    # --- 3. Create Unified Data Files ---
    logger.info("\n--- Step 3: Creating unified data files for processed fixtures ---")
    extractor = DailyGameExtractor()
    unified_files_to_predict = []
    
    # We can run extraction for today and tomorrow again
    # It will find the newly processed data
    for i in range(2):
        target_date = datetime.now() + timedelta(days=i)
        date_str = target_date.strftime('%Y-%m-%d')
        logger.info(f"Extracting unified data for {date_str}")
        
        # This process finds all fixtures for the date, processes them, and saves individual files
        # It returns a summary of what it did.
        extraction_summary = extractor.extract_games_for_date(date_str)
        
        # We need to find the files it created for the fixtures we just processed.
        if "games_processed_summary" in extraction_summary:
            for summary in extraction_summary["games_processed_summary"]:
                fixture_id = summary.get("fixture_id")
                if fixture_id in processed_fixture_ids:
                    # Construct the expected filename to find the file
                    # This logic must match the save logic in `save_individual_game_file`
                    match_data = db_manager.get_match_data(str(fixture_id))
                    if match_data:
                        home_name = extractor._sanitize_filename(match_data.get('home_team',{}).get('name', ''))
                        away_name = extractor._sanitize_filename(match_data.get('away_team',{}).get('name', ''))
                        fname = f"{date_str}_{home_name}_vs_{away_name}_{fixture_id}.json"
                        fpath = os.path.join(extractor.OUTPUT_DIR, fname)
                        if os.path.exists(fpath):
                            unified_files_to_predict.append(fpath)
                        else:
                            logger.warning(f"Could not find expected unified file: {fpath}")
    
    logger.info(f"Found {len(unified_files_to_predict)} unified files to run predictions on.")

    if not unified_files_to_predict:
        logger.warning("No unified data files were created. Cannot run predictions.")
        return

    # --- 4. Run Predictions on Unified Files ---
    logger.info("\n--- Step 4: Running predictions on unified data files ---")
    prediction_output_files = []
    for file_path in unified_files_to_predict:
        logger.info(f"Running prediction for: {os.path.basename(file_path)}")
        try:
            output_file = process_fixture_json(file_path)
            if output_file:
                prediction_output_files.append(output_file)
                logger.info(f"  -> Prediction saved to: {output_file}")
            else:
                logger.warning(f"  -> Prediction failed for {file_path}")
        except Exception as e:
            logger.error(f"  -> Error predicting for {file_path}: {e}", exc_info=True)

    if not prediction_output_files:
        logger.warning("No prediction files were generated. Cannot create papers.")
        return

    # --- 5. Generate Betting Papers ---
    logger.info("\n--- Step 5: Generating betting papers ---")
    # This assumes paper_generator can run on a directory of prediction files
    # We'll need to check `generate_papers` function signature
    # For now, let's assume a simple call is enough.
    # The `generate_papers` function in the provided code takes a dictionary of parameters.
    # We will need to construct this.
    
    # Example params for paper generation
    paper_params = {
        "input_directory": "data/output/predictions",
        "output_file": "data/output/betting_papers.json",
        "min_edge": 0.05,
        "min_probability": 0.5,
        "top_n_per_game": 3,
        "paper_sizes": [2, 3, 5],
        "max_papers_per_size": 10,
        "strategy": "greedy_prob_edge"
    }

    try:
        generate_papers(paper_params)
        logger.info("Betting paper generation complete.")
    except Exception as e:
        logger.error(f"Failed to generate betting papers: {e}", exc_info=True)

    logger.info("\n--- Step 6: Transforming data for frontend ---")
    transform_and_load_for_frontend(prediction_output_files)

    logger.info("\n--- Pipeline Finished ---")


def transform_and_load_for_frontend(prediction_files: list):
    """
    Transforms prediction outputs into the format expected by the frontend
    and loads it into the 'matches' collection.
    """
    if not prediction_files:
        logger.warning("No prediction files to transform for frontend.")
        return

    logger.info(f"Transforming {len(prediction_files)} prediction files for the frontend.")
    
    matches_to_load = []
    for file_path in prediction_files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)

            fixture_id = data.get("fixture_id")
            if not fixture_id:
                logger.warning(f"Skipping file {file_path}, missing fixture_id.")
                continue

            mc_probs = data.get("mc_probs")
            if not mc_probs:
                logger.warning(f"Skipping fixture {fixture_id}, missing mc_probs for alphaPredictions.")
                continue

            match_doc = {
                "_id": fixture_id,
                "matchId": int(fixture_id),
                "teamA": {
                    "name": data.get("home_team", "N/A"),
                    "slug": data.get("home_team", "n-a").lower().replace(" ", "-"),
                    "logoUrl": data.get("fixture_data", {}).get("raw_data",{}).get("home",{}).get("basic_info",{}).get("logo", "")
                },
                "teamB": {
                    "name": data.get("away_team", "N/A"),
                    "slug": data.get("away_team", "n-a").lower().replace(" ", "-"),
                    "logoUrl": data.get("fixture_data", {}).get("raw_data",{}).get("away",{}).get("basic_info",{}).get("logo", "")
                },
                "matchTime": data.get("fixture_data", {}).get("fixture_meta", {}).get("date_utc"),
                "league": data.get("fixture_data", {}).get("league", {}).get("name"),
                "status": 'UPCOMING',
                "alphaPredictions": {
                    "winA_prob": mc_probs.get("prob_H", 0),
                    "draw_prob": mc_probs.get("prob_D", 0),
                    "winB_prob": mc_probs.get("prob_A", 0),
                }
            }
            matches_to_load.append(match_doc)
        except Exception as e:
            logger.error(f"Error transforming file {file_path}: {e}", exc_info=True)

    if matches_to_load:
        logger.info(f"Loading {len(matches_to_load)} transformed matches to the 'matches' collection.")
        # This requires a new method in db_manager to bulk update 'matches'
        success = db_manager.save_matches_for_frontend(matches_to_load)
        if success:
            logger.info("Successfully loaded matches for the frontend.")
        else:
            logger.error("Failed to load matches for the frontend.")


if __name__ == "__main__":
    # Ensure event loop is handled correctly for cross-platform compatibility
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main()) 