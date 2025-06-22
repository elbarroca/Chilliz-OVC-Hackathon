import os
import logging
import time
from pymongo import MongoClient, UpdateOne, ReturnDocument
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, OperationFailure, BulkWriteError
from typing import Optional, Dict, Any, List, Set, Tuple
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Set NumExpr thread limit before any imports that might use it
os.environ['NUMEXPR_MAX_THREADS'] = '12'

logger = logging.getLogger(__name__)

class MongoDBManager:
    _instance = None
    _client: Optional[MongoClient] = None
    _db: Optional[Any] = None
    _matches_collection: Optional[Any] = None
    _standings_collection: Optional[Any] = None
    _odds_collection: Optional[Any] = None
    _team_fixtures_collection: Optional[Any] = None
    _statarea_collection: Optional[Any] = None
    _daily_games_collection: Optional[Any] = None
    _ml_ready_collection: Optional[Any] = None
    _match_processor_collection: Optional[Any] = None
    _predictions_collection: Optional[Any] = None
    _match_analysis_collection: Optional[Any] = None
    _match_results_collection: Optional[Any] = None
    _result_check_queue_collection: Optional[Any] = None
    _max_retries: int = 3
    _initialized: bool = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(MongoDBManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, db_name: str = "Alpha"):
        if self._initialized:
            assert self._db is not None, "DB should be initialized if _initialized is True"
            if self._db.name == db_name:
                 return
            else:
                logger.warning(f"Re-initializing MongoDBManager (existing db: {self._db.name}, requested: {db_name}). Closing previous connection.")
                self._reset_state()

        self._initialized = False

        script_dir = Path(__file__).resolve().parent
        project_root = script_dir.parent.parent.parent  # Go up one more level to reach the actual project root
        dotenv_path = project_root / '.env'
        load_dotenv(dotenv_path=dotenv_path)

        mongo_uri = os.getenv("MONGO_URI")
        assert mongo_uri, "MONGO_URI environment variable is required and must be set in .env"

        retry_count = 0
        connected = False

        while not connected and retry_count < self._max_retries:
            try:
                retry_count += 1
                logger.info(f"Attempting to connect to MongoDB (attempt {retry_count}/{self._max_retries})...")
                self._client = MongoClient(
                    mongo_uri,
                    serverSelectionTimeoutMS=15000,
                    connectTimeoutMS=15000,
                    socketTimeoutMS=60000,
                    maxPoolSize=50,
                    appname="Alpha-ML",
                    tls=False,
                )
                self._client.admin.command('ping')
                logger.info(f"Successfully connected to MongoDB server")

                self._db = self._client[db_name]
                assert self._db is not None, "Database object not obtained after connection"
                logger.info(f"Using database: {db_name}")

                self._matches_collection = self._db['matches']
                self._standings_collection = self._db['standings']
                self._odds_collection = self._db['odds']
                self._team_fixtures_collection = self._db['team_season_fixtures']
                self._statarea_collection = self._db['statarea_stats']
                self._daily_games_collection = self._db['daily_games']
                self._ml_ready_collection = self._db['ml_ready']
                self._match_processor_collection = self._db['match_processor']
                self._predictions_collection = self._db['predictions']
                self._match_analysis_collection = self._db['match_analysis']
                self._match_results_collection = self._db['match_results']
                self._result_check_queue_collection = self._db['result_check_queue']

                assert self._matches_collection is not None
                assert self._standings_collection is not None
                assert self._odds_collection is not None
                assert self._team_fixtures_collection is not None
                assert self._statarea_collection is not None
                assert self._daily_games_collection is not None
                assert self._ml_ready_collection is not None
                assert self._match_processor_collection is not None
                assert self._predictions_collection is not None
                assert self._match_analysis_collection is not None
                assert self._match_results_collection is not None
                assert self._result_check_queue_collection is not None

                logger.info("Initialized collections: matches, standings, odds, team_season_fixtures, statarea_stats, daily_games, ml_ready, match_processor, predictions, match_analysis, match_results, result_check_queue")

                self._initialized = True
                self._create_indexes()
                connected = True

            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                logger.warning(f"MongoDB connection attempt {retry_count} failed: {e}")
                if retry_count < self._max_retries:
                    wait_time = 2 ** retry_count
                    logger.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"MongoDB connection failed after {self._max_retries} attempts: {e}")
                    self._reset_state()
                    raise ConnectionFailure(f"MongoDB connection failed after {self._max_retries} attempts: {e}")

    def _create_indexes(self):
        """Creates or ensures necessary indexes using consistent field paths."""
        assert self._initialized, "DB Manager not initialized"
        logger.info("Attempting to create/ensure MongoDB indexes with corrected paths...")

        def _create_index_safely(collection, keys, name, **kwargs):
            """Helper to create index and log warnings on failure."""
            if collection is None:
                logger.warning(f"Collection object is None. Cannot create index '{name}'.")
                return
            try:
                collection.create_index(keys, name=name, **kwargs)
                # logger.debug(f"Index '{name}' ensured for collection '{collection.name}'.")
            except OperationFailure as e:
                 # Check for specific conflict codes
                 if e.code in [85, 86]: # IndexOptionsConflict, IndexKeySpecsConflict
                     logger.warning(f"Index conflict for '{name}' on '{collection.name}': {e.details}. Check definition matches DB.")
                 elif e.code == 11000: # DuplicateKey
                     logger.warning(f"Duplicate key error for index '{name}' on '{collection.name}': {e.details}. Data violates uniqueness or index should not be unique.")
                 else:
                     logger.error(f"OperationFailure creating index '{name}' on '{collection.name}': {e.details}", exc_info=True)
            except Exception as e:
                logger.error(f"Unexpected error creating index '{name}' on '{collection.name}': {e}", exc_info=True)

        # --- Matches Collection (Using fixture_details paths consistently) ---
        # Assuming _id is string version of fixture_id
        _create_index_safely(self._matches_collection, [("_id", 1)], name="match_fixture_id_str_idx") # Removed unique=True
        _create_index_safely(self._matches_collection, [("fixture_details.fixture.date", 1)], name="match_date_idx")
        _create_index_safely(self._matches_collection, [("fixture_details.teams.home.id", 1), ("fixture_details.fixture.date", -1)], name="match_home_team_date_idx")
        _create_index_safely(self._matches_collection, [("fixture_details.teams.away.id", 1), ("fixture_details.fixture.date", -1)], name="match_away_team_date_idx")
        _create_index_safely(self._matches_collection, [("fixture_details.league.id", 1)], name="match_league_id_idx") # Index on int league ID


        # --- Odds Collection ---
        # Assuming _id is string version of fixture_id
        _create_index_safely(self._odds_collection, [("_id", 1)], name="odds_fixture_id_str_idx") # Removed unique=True
        _create_index_safely(self._odds_collection, [("match_date_str", 1)], name="odds_match_date_str_idx")
        _create_index_safely(self._odds_collection, [("last_updated_utc", -1)], name="odds_last_updated_idx") # Index update time


        # --- Daily Games Collection ---
        # Assuming _id is the date string "YYYY-MM-DD"
        _create_index_safely(self._daily_games_collection, [("_id", 1)], name="daily_games_date_idx") # Removed unique=True

        # --- Predictions Collection ---
        # Use the date string as the primary identifier
        _create_index_safely(self._predictions_collection, [("date", 1)], name="predictions_date_idx", unique=True)
        _create_index_safely(self._predictions_collection, [("summary_stats.analysis_timestamp", -1)], name="predictions_timestamp_idx")

        # --- Match Analysis Collection ---
        # Use fixture_id as the primary identifier for individual match analyses
        _create_index_safely(self._match_analysis_collection, [("fixture_info.fixture_id", 1)], name="match_analysis_fixture_id_idx", unique=True)
        _create_index_safely(self._match_analysis_collection, [("fixture_info.date", 1)], name="match_analysis_date_idx")
        _create_index_safely(self._match_analysis_collection, [("fixture_info.analysis_timestamp", -1)], name="match_analysis_timestamp_idx")

        # --- Match Results Collection ---
        _create_index_safely(self._match_results_collection, [("fixture_id", 1)], name="match_results_fixture_id_idx", unique=True)
        _create_index_safely(self._match_results_collection, [("processed_at_utc", -1)], name="match_results_processed_at_idx")

        # --- Result Check Queue Collection ---
        _create_index_safely(self._result_check_queue_collection, [("check_after_utc", 1)], name="queue_check_time_idx")
        _create_index_safely(self._result_check_queue_collection, [("fixture_id", 1)], name="queue_fixture_id_idx", unique=True)

        # --- ML Ready Collection ---
        # Assuming _id is MatchID (preferred) or string fixture_id
        _create_index_safely(self._ml_ready_collection, [("_id", 1)], name="ml_doc_id_idx") # Removed unique=True # Primary lookup
        _create_index_safely(self._ml_ready_collection, [("fixture_id", 1)], name="ml_fixture_id_idx", sparse=True) # If fixture_id is stored separately
        _create_index_safely(self._ml_ready_collection, [("Date", 1)], name="ml_date_idx")
        _create_index_safely(self._ml_ready_collection, [("LeagueID", 1)], name="ml_league_id_idx")
        _create_index_safely(self._ml_ready_collection, [("processing_timestamp_utc", -1)], name="ml_proc_timestamp_idx")


        # --- Standings Collection ---
        # Index for finding latest standings for a league/season before a date
        _create_index_safely(self._standings_collection, [("league_id", 1), ("season", 1), ("date_retrieved_str", -1)], name="standings_league_season_date_idx")


        # --- StatArea Collection ---
        # Assuming _id is "{api_id}_{game_type}_{period}"
        _create_index_safely(self._statarea_collection, [("_id", 1)], name="statarea_doc_id_idx") # Should be unique now
        _create_index_safely(self._statarea_collection, [("api_id", 1)], name="statarea_api_id_idx")
        _create_index_safely(self._statarea_collection, [("api_id", 1), ("game_type", 1), ("period", 1), ("scrape_date_utc", -1)], name="statarea_timeseries_lookup_idx") # For historical lookups
        _create_index_safely(self._statarea_collection, [("scrape_date_utc", -1)], name="statarea_scrape_date_idx")


        # --- Match Processor Collection (If still used) ---
        # Assuming _id is string version of fixture_id
        if hasattr(self, '_match_processor_collection') and self._match_processor_collection is not None:
             _create_index_safely(self._match_processor_collection, [("_id", 1)], name="proc_fixture_id_str_idx") # Removed unique=True
             _create_index_safely(self._match_processor_collection, [("match_date_str", 1)], name="proc_match_date_str_idx")
             _create_index_safely(self._match_processor_collection, [("league_id", 1)], name="proc_league_id_idx")
             _create_index_safely(self._match_processor_collection, [("last_updated_utc", -1)], name="proc_last_updated_idx") # Use consistent naming

        logger.info("Finished attempting to create/ensure indexes.")

    def _reset_state(self):
        logger.debug("Resetting MongoDBManager state...")
        if self._client:
            try:
                self._client.close()
                logger.debug("MongoDB client closed.")
            except Exception as close_e:
                logger.error(f"Error closing MongoDB client during reset: {close_e}")

        self._client = None
        self._db = None
        self._matches_collection = None
        self._standings_collection = None
        self._odds_collection = None
        self._team_fixtures_collection = None
        self._statarea_collection = None
        self._daily_games_collection = None
        self._ml_ready_collection = None
        self._match_processor_collection = None
        self._predictions_collection = None
        self._match_analysis_collection = None
        self._match_results_collection = None
        self._result_check_queue_collection = None
        self._initialized = False
        MongoDBManager._instance = None
        logger.debug("MongoDBManager state reset complete.")

    def close_connection(self):
        logger.info("Closing MongoDB connection.")
        self._reset_state()

    def _parse_date_string(self, date_str: str) -> Optional[datetime]:
        assert isinstance(date_str, str) and date_str, "date_str must be a non-empty string"

        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.astimezone(timezone.utc)
        except ValueError:
            try:
                dt_naive = datetime.strptime(date_str, "%Y-%m-%d")
                return dt_naive.replace(tzinfo=timezone.utc)
            except ValueError:
                logger.error(f"Invalid date format: '{date_str}'. Expected YYYY-MM-DD or ISO 8601 format.")
                return None

    def get_match_data(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        assert self._initialized and self._matches_collection is not None, "DB not initialized or matches collection missing"
        assert isinstance(fixture_id, str) and fixture_id, "Fixture ID must be a non-empty string"

        return self._matches_collection.find_one({"_id": fixture_id})

    def get_team_historical_matches(self, team_id: int, match_date_str: str, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Retrieves historical matches for a team from the 'matches' collection
        played before a given date string.
        """
        assert self._initialized and self._matches_collection is not None
        assert isinstance(team_id, int), "Team ID must be an integer"
        assert isinstance(match_date_str, str), "match_date_str must be a string"
        
        try:
            query = {
                "$and": [
                    {"date_str": {"$lt": match_date_str}},
                    {"status_short": "FT"},
                    {"$or": [{"home_team_id": team_id}, {"away_team_id": team_id}]}
                ]
            }
            
            # Sort by date descending and limit the results
            cursor = self._matches_collection.find(query).sort("date_str", -1).limit(limit)
            
            return list(cursor)
        except Exception as e:
            logger.error(f"Failed to retrieve historical matches for team {team_id}: {e}", exc_info=True)
            return []

    def get_historical_matches(self, team_id: int, before_date: datetime, limit: int = 25) -> List[Dict[str, Any]]:
        """
        Retrieves historical matches for a team up to a certain date.
        """
        assert self._initialized and self._matches_collection is not None, "DB not initialized or matches collection missing"
        assert isinstance(team_id, int), "Team ID must be an integer"
        assert isinstance(before_date, datetime), "before_date must be a datetime object"
        assert limit > 0, "Limit must be positive"

        # Ensure before_date is timezone-aware UTC for comparison
        if before_date.tzinfo is None or before_date.tzinfo.utcoffset(before_date) != timezone.utc.utcoffset(before_date):
            before_date_utc = before_date.astimezone(timezone.utc)
            # logger.warning(f"Provided 'before_date' was naive or not UTC. Converted to UTC: {before_date_utc.isoformat()}")
        else:
             before_date_utc = before_date

        try:
            # --- !!! ADJUST FIELD PATHS AND TYPES HERE !!! ---
            query = {
                "$and": [
                    # Compare against the correct date field (ISODate object preferred)
                    {"fixture_details.fixture.date": {"$lt": before_date_utc.isoformat()}}, # Use ISO string if date is stored as string
                    # {"fixture_details.fixture.date": {"$lt": before_date_utc}}, # Use datetime object if date is ISODate

                    # Compare against the correct team ID fields and ensure TYPE matches (int vs string)
                    {"$or": [
                        {"fixture_details.teams.home.id": team_id}, # Assumes ID is stored as INT
                        {"fixture_details.teams.away.id": team_id}  # Assumes ID is stored as INT
                        # {"fixture_details.teams.home.id": str(team_id)}, # Use if ID is stored as STRING
                        # {"fixture_details.teams.away.id": str(team_id)}  # Use if ID is stored as STRING
                    ]}
                ]
            }
            # Sort by date descending to get the most recent matches first
            sort_order = [("fixture_details.fixture.date", -1)] # Use the correct date field path
            # --- End Adjustments ---

            cursor = self._matches_collection.find(query).sort(sort_order).limit(limit)
            matches = list(cursor)
            if not matches:
                 logger.warning(f"DB Query found 0 historical matches for team {team_id} before {before_date_utc.isoformat()}. Check query/data.")
            else:
                 logger.info(f"DB Query found {len(matches)} historical matches for team {team_id} before {before_date_utc.isoformat()}")
            return matches
        except Exception as e:
            logger.error(f"Error retrieving historical matches for team {team_id} before {before_date_utc.isoformat()}: {e}", exc_info=True)
            return []

    def save_ml_ready_data(self, ml_data: Dict[str, Any]) -> bool:
        assert self._initialized and self._ml_ready_collection is not None, "DB not initialized or ml_ready collection missing"
        assert isinstance(ml_data, dict), "ml_data must be a dictionary"

        match_id = ml_data.get("MatchID")
        fixture_id = ml_data.get("fixture_id")
        assert match_id or fixture_id, "ML data must contain 'MatchID' or 'fixture_id' for identification"

        doc_id = match_id if match_id else str(fixture_id)
        ml_data_to_save = ml_data.copy()
        ml_data_to_save["_id"] = doc_id
        ml_data_to_save["processing_timestamp_utc"] = datetime.now(timezone.utc)

        try:
            result = self._ml_ready_collection.update_one(
                {"_id": doc_id},
                {"$set": ml_data_to_save},
                upsert=True
            )
            op_type = "updated" if result.matched_count > 0 else "inserted"
            if result.upserted_id: op_type = "inserted"
            logger.info(f"Successfully {op_type} ML ready data for ID {doc_id}. Matched: {result.matched_count}, Modified: {result.modified_count}, Upserted ID: {result.upserted_id}")
            return True
        except OperationFailure as op_fail:
            logger.error(f"MongoDB operation failure saving ML ready data for {doc_id}: {op_fail.details}", exc_info=True)
            return False

    def save_ml_ready_data_bulk(self, ml_data_list: List[Dict[str, Any]]) -> bool:
        assert self._initialized and self._ml_ready_collection is not None, "DB not initialized or ml_ready collection missing"
        assert isinstance(ml_data_list, list), "ml_data_list must be a list of dictionaries"

        if not ml_data_list:
            logger.info("No ML ready data provided for bulk save.")
            return True

        operations = []
        current_time = datetime.now(timezone.utc)
        processed_ids: Set[str] = set()
        skipped_duplicates = 0

        for ml_data in ml_data_list:
            assert isinstance(ml_data, dict), "Each item in ml_data_list must be a dictionary"
            match_id = ml_data.get("MatchID")
            fixture_id = ml_data.get("fixture_id")
            assert match_id or fixture_id, "ML data must contain 'MatchID' or 'fixture_id'"

            doc_id = match_id if match_id else str(fixture_id)

            if doc_id in processed_ids:
                logger.warning(f"Duplicate ID '{doc_id}' found within the bulk ML data list. Skipping this entry.")
                skipped_duplicates += 1
                continue
            processed_ids.add(doc_id)

            ml_data_to_save = ml_data.copy()
            ml_data_to_save["_id"] = doc_id
            ml_data_to_save["processing_timestamp_utc"] = current_time

            operations.append(
                UpdateOne({"_id": doc_id}, {"$set": ml_data_to_save}, upsert=True)
            )

        if not operations:
            logger.info(f"No valid operations generated for bulk ML data save (initial list size: {len(ml_data_list)}, duplicates skipped: {skipped_duplicates}).")
            return True

        logger.info(f"Executing bulk write for {len(operations)} ML ready documents...")
        try:
            result = self._ml_ready_collection.bulk_write(operations, ordered=False)
            logger.info(
                f"Bulk ML ready data write complete. "
                f"Inserted: {result.upserted_count}, Updated: {result.modified_count}, "
                f"Matched: {result.matched_count}. "
                f"(Duplicates skipped in input list: {skipped_duplicates})"
            )
            return True
        except BulkWriteError as bwe:
            logger.error(f"Bulk write error saving ML ready data: {bwe.details}", exc_info=True)
            return False

    def check_ml_ready_data_exists(self, identifier: str) -> bool:
        assert self._initialized and self._ml_ready_collection is not None, "DB not initialized or ml_ready collection missing"
        assert isinstance(identifier, str) and identifier, "Identifier must be a non-empty string"

        count = self._ml_ready_collection.count_documents({"_id": identifier}, limit=1)
        return count > 0

    def save_daily_games(self, date_str: str, daily_payload: Dict[str, Any]) -> bool:
        """
        Saves or updates the daily games summary.
        The document ID is the date string in 'YYYY-MM-DD' format.
        """
        assert self._initialized and self._daily_games_collection is not None, "DB not initialized"
        assert isinstance(date_str, str) and len(date_str) == 10, "date_str must be 'YYYY-MM-DD'"
        
        try:
            # Use update_one with upsert=True to either insert a new document or update an existing one.
            self._daily_games_collection.update_one(
                {"_id": date_str},
                {"$set": daily_payload},
                upsert=True
            )
            # logger.debug(f"Successfully saved/updated daily games for {date_str}")
            return True
        except Exception as e:
            logger.error(f"Error saving daily games for {date_str}: {e}", exc_info=True)
            return False

    def get_daily_games(self, date_str: str) -> Optional[Dict[str, Any]]:
        assert self._initialized and self._daily_games_collection is not None, "DB not initialized"
        return self._daily_games_collection.find_one({"_id": date_str})

    def save_match_data(self, match_data: Dict[str, Any]) -> bool:
        """
        Saves or merges detailed match data into the 'matches' collection.
        It uses the '_id' field from the match_data dictionary for the update.
        This performs a deep merge of the provided data.
        """
        assert self._initialized and self._matches_collection is not None, "DB not initialized"
        
        if "_id" not in match_data:
            logger.error("Error saving match data: '_id' (fixture_id as string) is missing from the payload.")
            return False
            
        fixture_id = match_data["_id"]
        
        try:
            # Using update_one with $set will merge the new data with existing data.
            update_payload = {f"{k}": v for k, v in match_data.items() if k != "_id"}

            self._matches_collection.update_one(
                {"_id": fixture_id},
                {"$set": update_payload},
                upsert=True
            )
            # logger.debug(f"Successfully saved/merged match data for fixture {fixture_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving match data for fixture {fixture_id}: {e}", exc_info=True)
            return False

    def check_match_exists(self, fixture_id: str) -> bool:
        assert self._initialized and self._matches_collection is not None, "DB not initialized or matches collection missing"
        assert isinstance(fixture_id, str) and fixture_id, "Fixture ID must be a non-empty string"

        count = self._matches_collection.count_documents({"_id": fixture_id}, limit=1)
        return count > 0

    def save_odds_data(self, date_str: str, fixture_id: str, odds_payload: Dict[str, Any]) -> bool:
        assert self._initialized and self._odds_collection is not None, "DB not initialized or odds collection missing"
        assert isinstance(date_str, str) and len(date_str) == 10, "Date string must be in YYYY-MM-DD format"
        assert isinstance(fixture_id, str) and fixture_id, "Fixture ID must be a non-empty string"
        assert isinstance(odds_payload, dict), "odds_payload must be a dictionary"
        assert "bookmakers" in odds_payload, "'bookmakers' key is required in odds_payload"

        doc_id = fixture_id
        odds_payload_to_save = odds_payload.copy()
        odds_payload_to_save['_id'] = doc_id
        odds_payload_to_save['fixture_id'] = fixture_id
        odds_payload_to_save['match_date_str'] = date_str
        odds_payload_to_save['last_updated_utc'] = datetime.now(timezone.utc)

        try:
            result = self._odds_collection.update_one(
                {'_id': doc_id},
                {'$set': odds_payload_to_save},
                upsert=True
            )
            op_type = "updated" if result.matched_count > 0 else "inserted"
            if result.upserted_id: op_type = "inserted"
            logger.info(f"Successfully {op_type} odds data for fixture ID {fixture_id} (Date: {date_str}). Matched: {result.matched_count}, Modified: {result.modified_count}, Upserted ID: {result.upserted_id}")
            return True
        except OperationFailure as op_fail:
            logger.error(f"MongoDB operation failure saving odds for fixture {fixture_id}: {op_fail.details}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"Unexpected error saving odds for fixture {fixture_id}: {e}", exc_info=True)
            return False

    def get_odds_data(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        assert self._initialized and self._odds_collection is not None, "DB not initialized or odds collection missing"
        assert isinstance(fixture_id, str) and fixture_id, "Fixture ID must be a non-empty string"

        return self._odds_collection.find_one({'_id': fixture_id})

    def save_standings_data(self, date_str: str, league_id: str, season: int, standings_payload: Dict[str, Any]) -> bool:
        """Saves or updates a snapshot of league standings for a specific date."""
        assert self._initialized and self._standings_collection is not None, "DB not initialized"
        
        # Add retrieval metadata
        standings_payload["date_retrieved_str"] = date_str
        standings_payload["league_id"] = league_id
        standings_payload["season"] = season
        
        try:
            # Use a composite key for standings to allow multiple snapshots over time
            doc_id = f"{league_id}_{season}_{date_str}"
            self._standings_collection.update_one(
                {"_id": doc_id},
                {"$set": standings_payload},
                upsert=True
            )
            # logger.debug(f"Successfully saved standings for league {league_id} on {date_str}")
            return True
        except Exception as e:
            logger.error(f"Error saving standings for league {league_id} on {date_str}: {e}", exc_info=True)
            return False

    def get_latest_standings(self, league_id: str, season: int, before_date_str: Optional[str] = None) -> Optional[Dict[str, Any]]:
        assert self._initialized and self._standings_collection is not None, "DB not initialized or standings collection missing"
        assert isinstance(league_id, str) and league_id, "League ID must be a non-empty string"
        assert isinstance(season, int) and season > 1900, "Season must be a valid year integer"

        query = {"league_id": league_id, "season": season}
        if before_date_str:
            assert isinstance(before_date_str, str) and len(before_date_str) == 10, "before_date_str must be in YYYY-MM-DD format"
            query["date_retrieved_str"] = {"$lte": before_date_str}

        sort_order = [("date_retrieved_str", -1), ("saved_at_utc", -1)]

        return self._standings_collection.find_one(query, sort=sort_order)

    def save_statarea_data(self, stats_data: Dict[str, Any]) -> bool:
        assert self._initialized and self._statarea_collection is not None, "DB not initialized or statarea collection missing"
        assert isinstance(stats_data, dict), "stats_data must be a dictionary"
        api_id = stats_data.get("api_id")
        game_type = stats_data.get("game_type")
        period = stats_data.get("period")
        assert api_id and game_type and period is not None, "StatArea data must contain 'api_id', 'game_type', and 'period'"

        doc_id = f"{api_id}_{game_type}_{period}"
        stats_data_to_save = stats_data.copy()
        stats_data_to_save["_id"] = doc_id
        if "scrape_date_utc" not in stats_data_to_save or not isinstance(stats_data_to_save["scrape_date_utc"], datetime):
             stats_data_to_save["scrape_date_utc"] = datetime.now(timezone.utc)

        try:
            result = self._statarea_collection.update_one(
                {"_id": doc_id},
                {"$set": stats_data_to_save},
                upsert=True
            )
            op_type = "updated" if result.matched_count > 0 else "inserted"
            if result.upserted_id: op_type = "inserted"
            logger.info(f"Successfully {op_type} StatArea data for ID {doc_id}. Matched: {result.matched_count}, Modified: {result.modified_count}, Upserted ID: {result.upserted_id}")
            return True
        except OperationFailure as op_fail:
            logger.error(f"MongoDB operation failure saving StatArea data for {doc_id}: {op_fail.details}", exc_info=True)
            return False
        except Exception as e:
             logger.error(f"Unexpected error saving StatArea data for {doc_id}: {e}", exc_info=True)
             return False

    def check_statarea_data_needs_update(self, api_id: str, game_type: str, period: int, cache_expire_days: int = 1) -> bool:
        assert self._initialized and self._statarea_collection is not None, "DB not initialized or statarea collection missing"
        assert api_id and game_type and period is not None, "api_id, game_type, and period are required"
        assert isinstance(cache_expire_days, int) and cache_expire_days >= 0, "cache_expire_days must be a non-negative integer"

        doc_id = f"{api_id}_{game_type}_{period}"
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=cache_expire_days)

        document = self._statarea_collection.find_one(
            {"_id": doc_id},
            {"scrape_date_utc": 1}
        )
        if document:
            last_scrape_time = document.get("scrape_date_utc")
            if isinstance(last_scrape_time, datetime):
                if last_scrape_time.tzinfo is None:
                    last_scrape_time = last_scrape_time.replace(tzinfo=timezone.utc)
                if last_scrape_time >= cutoff_time:
                    return False
        return True

    def save_match_processor_data(self, processor_data: Dict[str, Any]) -> bool:
        """
        Saves or merges data from the MatchProcessor into the 'match_processor' collection.
        The document ID is the 'fixture_id'.
        """
        assert self._initialized and self._match_processor_collection is not None, "DB not initialized"
        
        if "fixture_id" not in processor_data:
            logger.error("Error saving match processor data: 'fixture_id' is missing.")
            return False
            
        fixture_id = str(processor_data["fixture_id"])
        
        try:
            update_payload = {f"{k}": v for k, v in processor_data.items() if k != "fixture_id"}
            
            self._match_processor_collection.update_one(
                {"_id": fixture_id},
                {"$set": update_payload},
                upsert=True
            )
            # logger.debug(f"Successfully saved match processor data for fixture {fixture_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving match processor data for {fixture_id}: {e}", exc_info=True)
            return False

    def check_prediction_exists(self, fixture_id: str) -> bool:
        """
        Check if prediction results for a specific fixture ID already exist.
        """
        assert self._initialized and self._predictions_collection is not None, "DB not initialized or predictions collection missing"
        assert isinstance(fixture_id, str) and fixture_id, "Fixture ID must be a non-empty string"
        
        try:
            return self._predictions_collection.count_documents({'_id': fixture_id}) > 0
        except Exception as e:
            logger.error(f"Error checking prediction existence for fixture {fixture_id}: {e}", exc_info=True)
            return False

    def get_match_processor_data(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a single match processor document by its fixture ID.
        """
        assert self._initialized and self._match_processor_collection is not None, "DB not initialized or match_processor collection missing"
        assert isinstance(fixture_id, str) and fixture_id, "Fixture ID must be a non-empty string"
        
        try:
            return self._match_processor_collection.find_one({'_id': fixture_id})
        except Exception as e:
            logger.error(f"Error getting match processor data for fixture {fixture_id}: {e}", exc_info=True)
            return None

    def check_match_processor_data_exists(self, fixture_id: str) -> bool:
        """
        Check if match processor data exists for a specific fixture ID.
        """
        assert self._initialized and self._match_processor_collection is not None, "DB not initialized or match_processor collection missing"
        assert isinstance(fixture_id, str) and fixture_id, "Fixture ID must be a non-empty string"
        
        try:
            return self._match_processor_collection.count_documents({'_id': fixture_id}) > 0
        except Exception as e:
            logger.error(f"Error checking match processor data existence for fixture {fixture_id}: {e}", exc_info=True)
            return False

    def get_fixture_ids_from_daily_games_range(self, start_date: datetime, end_date: datetime) -> List[int]:
        assert self._initialized and self._daily_games_collection is not None, "DB not initialized or daily_games collection missing"
        assert isinstance(start_date, datetime) and isinstance(end_date, datetime), "Start and end dates must be datetime objects"
        assert start_date <= end_date, "Start date must be before or equal to end date"

        start_date_str = start_date.strftime("%Y-%m-%d")
        end_date_str = end_date.strftime("%Y-%m-%d")
        logger.info(f"Querying daily_games for fixture IDs between {start_date_str} and {end_date_str}")

        query = {"date": {"$gte": start_date_str, "$lte": end_date_str}}
        projection = {"leagues": 1, "_id": 0}

        cursor = self._daily_games_collection.find(query, projection)
        all_fixture_ids: Set[int] = set()

        for daily_doc in cursor:
            leagues_dict = daily_doc.get("leagues", {})
            if not isinstance(leagues_dict, dict): continue
            for league_data in leagues_dict.values():
                if not isinstance(league_data, dict): continue
                matches_list = league_data.get("matches", [])
                if not isinstance(matches_list, list): continue
                for match in matches_list:
                    if not isinstance(match, dict): continue
                    fixture_id = match.get("id")
                    if fixture_id is not None:
                        try:
                            all_fixture_ids.add(int(fixture_id))
                        except (ValueError, TypeError):
                            logger.warning(f"Could not convert fixture ID '{fixture_id}' to int in daily_games doc.")

        logger.info(f"Found {len(all_fixture_ids)} unique fixture IDs in daily_games between {start_date_str} and {end_date_str}.")
        return sorted(list(all_fixture_ids))

    def find_missing_fixture_ids_in_matches(self, fixture_ids_to_check: List[int]) -> List[int]:
        assert self._initialized and self._matches_collection is not None, "DB not initialized or matches collection missing"
        assert isinstance(fixture_ids_to_check, list), "Input must be a list of fixture IDs"

        if not fixture_ids_to_check:
            return []

        fixture_ids_str = [str(fid) for fid in fixture_ids_to_check]
        logger.info(f"Checking existence of {len(fixture_ids_str)} fixture IDs in 'matches' collection...")

        query = {"_id": {"$in": fixture_ids_str}}
        projection = {"_id": 1}

        cursor = self._matches_collection.find(query, projection)
        found_ids_str: Set[str] = {doc["_id"] for doc in cursor}
        logger.info(f"Found {len(found_ids_str)} existing matches in the collection.")

        missing_ids_int: List[int] = [
            fid for fid, fid_str in zip(fixture_ids_to_check, fixture_ids_str)
            if fid_str not in found_ids_str
        ]

        logger.info(f"Identified {len(missing_ids_int)} missing fixture IDs in 'matches'.")
        return missing_ids_int

    def get_match_fixture_ids_for_date(self, date_str: str) -> List[int]:
        """
        Get all fixture IDs for matches on a specific date from daily_games collection.
        """
        assert self._initialized and self._daily_games_collection is not None, "DB not initialized or daily_games collection missing"
        assert isinstance(date_str, str) and len(date_str) == 10, "Date string must be in YYYY-MM-DD format"
        
        logger.info(f"Fetching fixture IDs for date: {date_str}")
        
        daily_games_doc = self._daily_games_collection.find_one({"_id": date_str})
        if not daily_games_doc:
            logger.warning(f"No daily games document found for date {date_str}")
            return []
        
        fixture_ids: Set[int] = set()
        leagues_dict = daily_games_doc.get("leagues", {})
        
        if not isinstance(leagues_dict, dict):
            logger.warning(f"Invalid leagues data structure in daily games for {date_str}")
            return []
        
        for league_data in leagues_dict.values():
            if not isinstance(league_data, dict):
                continue
            matches_list = league_data.get("matches", [])
            if not isinstance(matches_list, list):
                continue
            for match in matches_list:
                if not isinstance(match, dict):
                    continue
                fixture_id = match.get("id")
                if fixture_id is not None:
                    try:
                        fixture_ids.add(int(fixture_id))
                    except (ValueError, TypeError):
                        logger.warning(f"Could not convert fixture ID '{fixture_id}' to int for date {date_str}")
        
        logger.info(f"Found {len(fixture_ids)} fixture IDs for date {date_str}")
        return sorted(list(fixture_ids))

    def save_matches_for_frontend(self, matches_to_load: List[Dict[str, Any]]) -> bool:
        """
        Save transformed match data for frontend consumption.
        Uses bulk operations for efficiency.
        """
        assert self._initialized and self._matches_collection is not None, "DB not initialized or matches collection missing"
        assert isinstance(matches_to_load, list), "matches_to_load must be a list of dictionaries"
        
        if not matches_to_load:
            logger.info("No matches provided for frontend save.")
            return True
        
        operations = []
        current_time = datetime.now(timezone.utc)
        processed_ids: Set[str] = set()
        skipped_duplicates = 0
        
        for match_data in matches_to_load:
            assert isinstance(match_data, dict), "Each match must be a dictionary"
            match_id = match_data.get("_id") or match_data.get("matchId")
            assert match_id, "Match data must contain '_id' or 'matchId'"
            
            doc_id = str(match_id)
            
            if doc_id in processed_ids:
                logger.warning(f"Duplicate match ID '{doc_id}' found in frontend data. Skipping.")
                skipped_duplicates += 1
                continue
            processed_ids.add(doc_id)
            
            match_data_to_save = match_data.copy()
            match_data_to_save["_id"] = doc_id
            match_data_to_save["frontend_updated_utc"] = current_time
            match_data_to_save["data_source"] = "pipeline_frontend_transform"
            
            operations.append(
                UpdateOne({"_id": doc_id}, {"$set": match_data_to_save}, upsert=True)
            )
        
        if not operations:
            logger.info(f"No valid operations for frontend matches save (duplicates skipped: {skipped_duplicates})")
            return True
        
        logger.info(f"Executing bulk write for {len(operations)} frontend match documents...")
        try:
            result = self._matches_collection.bulk_write(operations, ordered=False)
            logger.info(
                f"Bulk frontend matches write complete. "
                f"Inserted: {result.upserted_count}, Updated: {result.modified_count}, "
                f"Matched: {result.matched_count}. "
                f"(Duplicates skipped: {skipped_duplicates})"
            )
            return True
        except BulkWriteError as bwe:
            logger.error(f"Bulk write error saving frontend matches: {bwe.details}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"Unexpected error saving frontend matches: {e}", exc_info=True)
            return False

    def save_prediction_results(self, prediction_data: Dict[str, Any]) -> bool:
        """
        Save prediction results to a dedicated collection for tracking.
        """
        assert self._initialized and self._predictions_collection is not None, "DB not initialized or predictions collection missing"
        assert isinstance(prediction_data, dict), "prediction_data must be a dictionary"
        
        fixture_id = prediction_data.get("fixture_id")
        assert fixture_id, "Prediction data must contain 'fixture_id'"
        
        doc_id = str(fixture_id)
        prediction_data_to_save = prediction_data.copy()
        prediction_data_to_save["_id"] = doc_id
        prediction_data_to_save["prediction_timestamp_utc"] = datetime.now(timezone.utc)
        
        try:
            result = self._predictions_collection.update_one(
                {"_id": doc_id},
                {"$set": prediction_data_to_save},
                upsert=True
            )
            op_type = "updated" if result.matched_count > 0 else "inserted"
            if result.upserted_id: op_type = "inserted"
            logger.info(f"Successfully {op_type} prediction data for fixture ID {fixture_id}. Matched: {result.matched_count}, Modified: {result.modified_count}, Upserted ID: {result.upserted_id}")
            return True
        except OperationFailure as op_fail:
            logger.error(f"MongoDB operation failure saving prediction data for {fixture_id}: {op_fail.details}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"Unexpected error saving prediction data for {fixture_id}: {e}", exc_info=True)
            return False

    def get_prediction_results(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        """
        Get prediction results for a specific fixture.
        """
        assert self._initialized and self._predictions_collection is not None, "DB not initialized or predictions collection missing"
        assert isinstance(fixture_id, str) and fixture_id, "Fixture ID must be a non-empty string"
        
        return self._predictions_collection.find_one({"_id": fixture_id})

    def get_matches_by_date_range(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """
        Retrieves all matches within a specified date range.
        """
        assert self._initialized and self._matches_collection is not None, "DB not initialized or matches collection missing"
        assert isinstance(start_date, str) and len(start_date) == 10, "start_date must be in YYYY-MM-DD format"
        assert isinstance(end_date, str) and len(end_date) == 10, "end_date must be in YYYY-MM-DD format"
        
        query = {
            "date_str": {
                "$gte": start_date,
                "$lte": end_date
            }
        }
        
        cursor = self._matches_collection.find(query).sort("date_str", 1)
        matches = list(cursor)
        logger.info(f"Found {len(matches)} matches between {start_date} and {end_date}")
        return matches

    def save_betting_papers(self, papers_data: Dict[str, Any]) -> bool:
        """
        Save generated betting papers to MongoDB.
        """
        assert self._initialized and self._db is not None, "DB not initialized"
        assert isinstance(papers_data, dict), "papers_data must be a dictionary"
        
        # Create betting_papers collection if it doesn't exist
        if not hasattr(self, '_betting_papers_collection') or self._betting_papers_collection is None:
            self._betting_papers_collection = self._db['betting_papers']
        
        # Use current date as document ID
        doc_id = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        papers_data_to_save = papers_data.copy()
        papers_data_to_save["_id"] = doc_id
        papers_data_to_save["generated_at_utc"] = datetime.now(timezone.utc)
        
        try:
            result = self._betting_papers_collection.update_one(
                {"_id": doc_id},
                {"$set": papers_data_to_save},
                upsert=True
            )
            op_type = "updated" if result.matched_count > 0 else "inserted"
            if result.upserted_id: op_type = "inserted"
            logger.info(f"Successfully {op_type} betting papers for {doc_id}. Matched: {result.matched_count}, Modified: {result.modified_count}, Upserted ID: {result.upserted_id}")
            return True
        except OperationFailure as op_fail:
            logger.error(f"MongoDB operation failure saving betting papers for {doc_id}: {op_fail.details}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"Unexpected error saving betting papers for {doc_id}: {e}", exc_info=True)
            return False

    def get_pipeline_status(self) -> Dict[str, Any]:
        """
        Get status information about the pipeline data in MongoDB.
        """
        assert self._initialized, "DB not initialized"
        
        status = {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "collections": {}
        }
        
        # Check each collection
        collections_to_check = [
            ("matches", self._matches_collection),
            ("daily_games", self._daily_games_collection),
            ("match_processor", self._match_processor_collection),
            ("ml_ready", self._ml_ready_collection),
            ("odds", self._odds_collection),
            ("standings", self._standings_collection),
            ("statarea_stats", self._statarea_collection)
        ]
        
        for name, collection in collections_to_check:
            if collection is not None:
                try:
                    count = collection.count_documents({})
                    # Get latest document timestamp if available
                    latest_doc = collection.find_one(
                        {}, 
                        sort=[("last_updated_utc", -1), ("_id", -1)]
                    )
                    latest_update = None
                    if latest_doc:
                        for timestamp_field in ["last_updated_utc", "processing_timestamp_utc", "saved_at_utc", "scrape_date_utc"]:
                            if timestamp_field in latest_doc and isinstance(latest_doc[timestamp_field], datetime):
                                latest_update = latest_doc[timestamp_field].isoformat()
                                break
                    
                    status["collections"][name] = {
                        "document_count": count,
                        "latest_update": latest_update
                    }
                except Exception as e:
                    status["collections"][name] = {
                        "error": str(e)
                    }
            else:
                status["collections"][name] = {
                    "error": "Collection not initialized"
                }
        
        return status

    def save_team_season_fixture_list(self, team_id: int, season: int, fixture_ids: List[int]) -> bool:
        """
        Saves or updates the list of fixture IDs for a team's season.
        """
        assert self._initialized and self._team_fixtures_collection is not None, "DB not initialized"

        try:
            doc_id = f"{team_id}_{season}"
            payload = {
                "team_id": team_id,
                "season": season,
                "fixture_ids": fixture_ids,
                "last_updated_utc": datetime.now(timezone.utc)
            }
            self._team_fixtures_collection.update_one(
                {"_id": doc_id},
                {"$set": payload},
                upsert=True
            )
            # logger.debug(f"Successfully saved fixture list for team {team_id}, season {season}")
            return True
        except Exception as e:
            logger.error(f"Error saving team fixture list for {team_id}: {e}", exc_info=True)
            return False

    def get_team_season_fixture_list(self, team_id: int, season: int) -> Optional[List[int]]:
        """
        Get the list of fixture IDs for a specific team and season.
        """
        assert self._initialized and self._team_fixtures_collection is not None, "DB not initialized"
        assert isinstance(team_id, int), "team_id must be an integer"
        assert isinstance(season, int), "season must be an integer"
        
        doc_id = f"{team_id}_{season}"
        document = self._team_fixtures_collection.find_one({"_id": doc_id})
        
        if document:
            return document.get("fixture_ids")
        return None

    def save_predictions_analysis(self, analysis_data: Dict[str, Any]) -> bool:
        """
        Saves the entire prediction analysis payload for a specific date to the 'predictions' collection.
        It uses the date as the unique identifier to update/insert the document.

        Args:
            analysis_data (Dict[str, Any]): The complete JSON payload from the analysis endpoint.

        Returns:
            bool: True if the operation was successful, False otherwise.
        """
        assert self._initialized and self._predictions_collection is not None, "DB not initialized or predictions collection missing"
        assert 'date' in analysis_data, "analysis_data must contain a 'date' key"
        
        try:
            date_str = analysis_data['date']
            logger.info(f"Saving prediction analysis for date: {date_str}")

            # Use update_one with upsert=True to either insert a new document or replace an existing one for that date.
            # The filter targets the 'date' field within the document.
            result = self._predictions_collection.update_one(
                {'date': date_str},
                {'$set': analysis_data},
                upsert=True
            )

            if result.upserted_id or result.modified_count > 0:
                logger.info(f"Successfully saved/updated prediction analysis for {date_str}. (Upserted ID: {result.upserted_id}, Modified: {result.modified_count})")
                return True
            else:
                logger.info(f"Prediction analysis data for {date_str} was already up to date. No changes made.")
                return True

        except OperationFailure as e:
            logger.error(f"MongoDB operation failed while saving prediction analysis for date {analysis_data.get('date')}: {e}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"An unexpected error occurred while saving prediction analysis: {e}", exc_info=True)
            return False

    def save_individual_match_analysis(self, match_analysis: Dict[str, Any]) -> bool:
        """
        Saves an individual match analysis to the 'match_analysis' collection.
        Uses fixture_id as the unique identifier.

        Args:
            match_analysis (Dict[str, Any]): The individual match analysis data.

        Returns:
            bool: True if the operation was successful, False otherwise.
        """
        assert self._initialized and self._match_analysis_collection is not None, "DB not initialized or match_analysis collection missing"
        assert 'fixture_info' in match_analysis, "match_analysis must contain 'fixture_info'"
        assert 'fixture_id' in match_analysis['fixture_info'], "fixture_info must contain 'fixture_id'"
        
        try:
            fixture_id = match_analysis['fixture_info']['fixture_id']
            logger.debug(f"Saving individual match analysis for fixture: {fixture_id}")

            # Use fixture_id as the unique identifier for the collection
            result = self._match_analysis_collection.update_one(
                {'fixture_info.fixture_id': fixture_id},
                {'$set': match_analysis},
                upsert=True
            )

            if result.upserted_id or result.modified_count > 0:
                logger.debug(f"Successfully saved/updated match analysis for fixture {fixture_id}. (Upserted ID: {result.upserted_id}, Modified: {result.modified_count})")
                return True
            else:
                logger.debug(f"Match analysis for fixture {fixture_id} was already up to date. No changes made.")
                return True

        except OperationFailure as e:
            logger.error(f"MongoDB operation failed while saving match analysis for fixture {match_analysis.get('fixture_info', {}).get('fixture_id')}: {e}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"An unexpected error occurred while saving match analysis: {e}", exc_info=True)
            return False

    def get_individual_match_analysis(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves an individual match analysis by fixture ID from the 'match_analysis' collection.

        Args:
            fixture_id (str): The fixture ID to search for.

        Returns:
            Optional[Dict[str, Any]]: The match analysis data if found, None otherwise.
        """
        assert self._initialized and self._match_analysis_collection is not None, "DB not initialized or match_analysis collection missing"
        assert isinstance(fixture_id, str) and fixture_id, "Fixture ID must be a non-empty string"
        
        try:
            return self._match_analysis_collection.find_one({'fixture_info.fixture_id': fixture_id})
        except Exception as e:
            logger.error(f"Error retrieving match analysis for fixture {fixture_id}: {e}", exc_info=True)
            return None

    def get_processed_fixture_ids_for_date(self, date_str: str) -> List[int]:
        """
        Returns a list of fixture IDs for a given date that have already been
        processed and exist in the match_processor collection.
        """
        assert self._match_processor_collection is not None, "match_processor_collection not initialized"
        fixture_ids = []
        try:
            # Find documents where the match_date_str matches.
            # Assumes 'match_date_str' is a field in your match_processor documents.
            processed_fixtures = self._match_processor_collection.find(
                {"match_date_str": date_str},
                {"fixture_id": 1} # Only return the fixture_id
            )
            fixture_ids = [int(doc['fixture_id']) for doc in processed_fixtures if 'fixture_id' in doc]
            logger.debug(f"Found {len(fixture_ids)} processed fixture IDs for {date_str}")
        except Exception as e:
            logger.error(f"Error fetching processed fixture IDs for {date_str}: {e}", exc_info=True)
        return fixture_ids

    def is_initialized(self) -> bool:
        """Checks if the database manager is properly initialized."""
        return self._initialized and self._client is not None and self._db is not None

    def save_match_result(self, result_data: Dict[str, Any]) -> bool:
        """
        Saves a match result to the 'match_results' collection.
        Uses fixture_id as the unique identifier.
        """
        assert self._initialized and self._match_results_collection is not None, "DB not initialized or match_results collection missing"
        assert 'fixture_id' in result_data, "result_data must contain 'fixture_id'"

        try:
            fixture_id = str(result_data['fixture_id'])
            
            # The filter should be on the document's unique _id
            filter_query = {'_id': fixture_id}
            
            # The update payload should not contain the immutable _id field
            update_payload = result_data.copy()
            update_payload.pop('_id', None)

            result = self._match_results_collection.update_one(
                filter_query,
                {'$set': update_payload},
                upsert=True
            )

            if result.upserted_id or result.modified_count > 0:
                logger.info(f"Successfully saved/updated match result for fixture {fixture_id}.")
                return True
            else:
                # This case might not be hit if a field like 'processed_at_utc' always changes
                logger.info(f"Match result for fixture {fixture_id} was already up to date.")
                return True

        except OperationFailure as e:
            # This catch block might be redundant now but is good for safety.
            if e.code == 11000:
                 logger.warning(f"Caught a duplicate key error for fixture {fixture_id} which should have been an update. This may indicate an issue with the filter logic. Error: {e}")
                 return True # Assuming data is already present
            logger.error(f"MongoDB operation failed while saving match result for fixture {result_data.get('fixture_id')}: {e}", exc_info=True)
            return False
        except Exception as e:
            logger.error(f"An unexpected error occurred while saving match result: {e}", exc_info=True)
            return False

    def get_match_details_for_scheduling(self, fixture_ids: List[int]) -> List[Dict[str, Any]]:
        """
        Retrieves essential details (fixture_id, date) for given fixture IDs
        from the 'matches' collection to be used for scheduling result checks.
        """
        assert self._initialized and self._matches_collection is not None, "DB not initialized or matches collection missing"
        if not fixture_ids:
            return []
        
        fixture_ids_str = [str(fid) for fid in fixture_ids]
        query = {"_id": {"$in": fixture_ids_str}}
        projection = {
            "_id": 1,
            "fixture_details.fixture.date": 1
        }
        
        cursor = self._matches_collection.find(query, projection)
        
        details = []
        for doc in cursor:
            try:
                details.append({
                    "fixture_id": int(doc["_id"]),
                    "date": doc["fixture_details"]["fixture"]["date"]
                })
            except (KeyError, ValueError, TypeError) as e:
                logger.warning(f"Could not process match doc for scheduling (ID: {doc.get('_id')}): {e}")
                continue
        
        return details

    def schedule_result_checks(self, fixtures_to_schedule: List[Dict[str, Any]], check_delay_minutes: int = 115) -> bool:
        """
        Schedules fixtures to have their results checked in the future.
        It avoids adding duplicates if a fixture is already in the queue.

        Args:
            fixtures_to_schedule (List[Dict[str, Any]]): List of dicts, each with 'fixture_id' and 'date'.
            check_delay_minutes (int): How many minutes after game start to check for results.
        """
        assert self._initialized and self._result_check_queue_collection is not None, "DB not initialized or queue collection missing"
        if not fixtures_to_schedule:
            return True

        operations = []
        for fixture in fixtures_to_schedule:
            try:
                fixture_id = int(fixture["fixture_id"])
                match_date_str = fixture["date"]
                match_date = datetime.fromisoformat(match_date_str.replace('Z', '+00:00'))
                
                check_after_utc = match_date + timedelta(minutes=check_delay_minutes)
                
                # Use update_one with upsert to avoid duplicates.
                # The filter checks for fixture_id, and the $setOnInsert operator
                # ensures we only set the fields when a new document is created.
                operations.append(
                    UpdateOne(
                        {"fixture_id": fixture_id},
                        {
                            "$setOnInsert": {
                                "fixture_id": fixture_id,
                                "check_after_utc": check_after_utc,
                                "scheduled_at_utc": datetime.now(timezone.utc)
                            }
                        },
                        upsert=True
                    )
                )
            except (KeyError, ValueError, TypeError) as e:
                logger.warning(f"Skipping scheduling for fixture due to invalid data: {fixture}. Error: {e}")
                continue
        
        if not operations:
            logger.info("No valid fixtures to schedule for result checking.")
            return True

        try:
            result = self._result_check_queue_collection.bulk_write(operations, ordered=False)
            logger.info(f"Scheduled result checks. New entries added: {result.upserted_count}.")
            return True
        except BulkWriteError as bwe:
            # It's common to have duplicate key errors here if upsert races, which is fine.
            # We only care about other, more serious errors.
            non_duplicate_errors = [err for err in bwe.details.get('writeErrors', []) if err.get('code') != 11000]
            if non_duplicate_errors:
                logger.error(f"Serious bulk write error scheduling result checks: {non_duplicate_errors}")
                return False
            else:
                logger.info(f"Bulk write for scheduling completed with some expected duplicate key ignores.")
                return True
        except Exception as e:
            logger.error(f"Unexpected error scheduling result checks: {e}", exc_info=True)
            return False

    def get_due_result_checks(self) -> List[int]:
        """
        Atomically finds and removes due result checks from the queue.

        Returns:
            List[int]: A list of fixture IDs that are due for a result check.
        """
        assert self._initialized and self._result_check_queue_collection is not None, "DB not initialized or queue collection missing"
        
        due_fixtures = []
        now_utc = datetime.now(timezone.utc)

        while True:
            # Atomically find a document that is due and delete it.
            # This prevents multiple workers from picking up the same job.
            doc = self._result_check_queue_collection.find_one_and_delete(
                {"check_after_utc": {"$lte": now_utc}}
            )
            
            if doc:
                fixture_id = doc.get("fixture_id")
                if fixture_id:
                    due_fixtures.append(fixture_id)
            else:
                # No more due documents found
                break
        
        if due_fixtures:
            logger.info(f"Found and removed {len(due_fixtures)} fixtures from the result check queue.")
            
        return due_fixtures

# Create a global instance for backward compatibility
# This allows other modules to import db_manager as they expect
db_manager = MongoDBManager()
