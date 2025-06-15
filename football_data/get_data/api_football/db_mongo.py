import os
import logging
from pymongo import MongoClient, UpdateOne
from pymongo.errors import ConnectionFailure, OperationFailure, PyMongoError
from bson import ObjectId
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MongoDBManager:
    """A singleton class to manage MongoDB connections and operations."""
    _instance = None
    _client = None
    _db = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MongoDBManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        mongo_uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("DB_NAME", "agenticfc")
        
        if not mongo_uri:
            logger.error("MONGODB_URI environment variable not set.")
            raise ValueError("MONGODB_URI is not set.")
            
        try:
            self._client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
            self._client.admin.command('ping')
            self._db = self._client[db_name]
            self._initialized = True
            logger.info(f"✅ Successfully connected to MongoDB. DB: '{db_name}'")
        except (ConnectionFailure, OperationFailure) as e:
            logger.error(f"❌ MongoDB connection or authentication failed: {e}", exc_info=True)
            raise

    def close_connection(self):
        if self._client:
            self._client.close()
            self._initialized = False
            logger.info("MongoDB connection closed.")

    def _get_collection(self, collection_name: str):
        if not self._initialized or not self._db:
            logger.error("MongoDBManager not initialized. Call __init__ first.")
            return None
        return self._db[collection_name]

    def save_daily_games(self, date_str: str, data: Dict[str, Any]) -> bool:
        """Saves the summary of games for a specific day."""
        collection = self._get_collection("daily_games")
        if collection is None: return False
        try:
            collection.update_one({"date": date_str}, {"$set": data}, upsert=True)
            logger.info(f"Saved daily games summary for {date_str}.")
            return True
        except PyMongoError as e:
            logger.error(f"Error saving daily games for {date_str}: {e}")
            return False

    def get_daily_games(self, date_str: str) -> Optional[Dict[str, Any]]:
        """Retrieves the summary of games for a specific day."""
        collection = self._get_collection("daily_games")
        if collection is None: return None
        try:
            return collection.find_one({"date": date_str})
        except PyMongoError as e:
            logger.error(f"Error getting daily games for {date_str}: {e}")
            return None

    def save_match_data(self, match_data: Dict[str, Any]) -> bool:
        """Saves detailed data for a single match, using 'fixture_id' as the unique key."""
        if "fixture_id" not in match_data:
            logger.error("Cannot save match data: 'fixture_id' is missing.")
            return False
        
        collection = self._get_collection("matches")
        if collection is None: return False
        
        fixture_id = str(match_data["fixture_id"])
        
        try:
            # Use fixture_id as the primary identifier for upserting
            collection.update_one(
                {"fixture_id": fixture_id},
                {"$set": match_data},
                upsert=True
            )
            logger.debug(f"Saved match data for fixture {fixture_id}.")
            return True
        except PyMongoError as e:
            logger.error(f"Error saving match data for fixture {fixture_id}: {e}")
            return False

    def get_match_data(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves detailed data for a single match by its fixture_id."""
        collection = self._get_collection("matches")
        if collection is None: return None
        try:
            return collection.find_one({"fixture_id": fixture_id})
        except PyMongoError as e:
            logger.error(f"Error getting match data for fixture {fixture_id}: {e}")
            return None

    def get_match_fixture_ids_for_date(self, date_str: str) -> List[str]:
        """Gets all fixture IDs for a given date from the 'matches' collection."""
        collection = self._get_collection("matches")
        if collection is None: return []
        fixture_ids = []
        try:
            # Find matches where the 'date_str' field matches
            for match in collection.find({"date_str": date_str}, {"fixture_id": 1}):
                if match.get("fixture_id"):
                    fixture_ids.append(str(match["fixture_id"]))
            return fixture_ids
        except PyMongoError as e:
            logger.error(f"Error getting fixture IDs for date {date_str}: {e}")
            return []

    def save_standings_data(self, date_str: str, league_id: str, season: int, data: Dict[str, Any]) -> bool:
        """Saves league standings data."""
        collection = self._get_collection("standings")
        if collection is None: return False
        try:
            # Unique key can be a combination of date, league, and season
            unique_filter = {"date_str": date_str, "league.id": str(league_id), "league.season": season}
            collection.update_one(unique_filter, {"$set": data}, upsert=True)
            logger.debug(f"Saved standings for league {league_id} on {date_str}.")
            return True
        except PyMongoError as e:
            logger.error(f"Error saving standings for league {league_id}: {e}")
            return False

    def get_previous_matches_for_team(self, team_id: int, date_before_timestamp: int, limit: int = 15) -> List[Dict[str, Any]]:
        """Fetches previous matches for a team before a given timestamp."""
        collection = self._get_collection("matches")
        if collection is None: return []
        
        try:
            team_id_str = str(team_id)
            # Query for matches involving the team before the specified timestamp, sorted descendingly
            query = {
                "$and": [
                    {"match_info.timestamp": {"$lt": date_before_timestamp}},
                    {"$or": [{"teams.home.id": team_id_str}, {"teams.away.id": team_id_str}]}
                ]
            }
            cursor = collection.find(query).sort("match_info.timestamp", -1).limit(limit)
            return list(cursor)
        except PyMongoError as e:
            logger.error(f"Error fetching previous matches for team {team_id}: {e}")
            return []

    def save_match_processor_data(self, fixture_id: Union[int, str], data: Dict[str, Any]) -> bool:
        """Saves the output from MatchProcessor for a given fixture."""
        collection = self._get_collection("match_processor_data")
        if collection is None: return False
        
        try:
            fixture_id_str = str(fixture_id)
            payload = {
                "fixture_id": fixture_id_str,
                "data": data,
                "updated_at": datetime.now(timezone.utc)
            }
            collection.update_one({"fixture_id": fixture_id_str}, {"$set": payload}, upsert=True)
            logger.info(f"Saved match processor data for fixture {fixture_id_str}.")
            return True
        except PyMongoError as e:
            logger.error(f"Error saving match processor data for fixture {fixture_id_str}: {e}")
            return False

    def get_match_processor_data(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves the MatchProcessor data for a given fixture."""
        collection = self._get_collection("match_processor_data")
        if collection is None: return None
        try:
            doc = collection.find_one({"fixture_id": fixture_id})
            return doc.get("data") if doc else None
        except PyMongoError as e:
            logger.error(f"Error getting match processor data for fixture {fixture_id}: {e}")
            return None

    def get_latest_statarea_data(self, statarea_id: str, game_type: str, limit: int) -> Optional[Dict[str, Any]]:
        """
        Placeholder for fetching latest StatArea data.
        This would query a collection 'statarea_data' for the latest document
        matching the statarea_id and game_type.
        """
        # This is a placeholder implementation.
        logger.debug(f"Placeholder: Attempting to get StatArea data for {statarea_id} ({game_type}). Not implemented.")
        return None

    def get_elo_rating(self, team_id: int, timestamp: int) -> Optional[float]:
        """
        Placeholder for fetching a team's ELO rating before a specific timestamp.
        This would query a collection 'elo_ratings' for the latest rating for the team
        before the given time.
        """
        # This is a placeholder implementation.
        logger.debug(f"Placeholder: Attempting to get ELO for team {team_id} before {timestamp}. Not implemented.")
        return None
        
    def save_odds_data(self, date_str: str, fixture_id: str, data: Dict[str, Any]) -> bool:
        """Saves odds data for a fixture."""
        collection = self._get_collection("odds")
        if collection is None: return False
        try:
            collection.update_one({"fixture_id": fixture_id}, {"$set": data}, upsert=True)
            logger.info(f"Saved odds data for fixture {fixture_id}.")
            return True
        except PyMongoError as e:
            logger.error(f"Error saving odds for fixture {fixture_id}: {e}")
            return False

    def get_odds_data(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves odds data for a given fixture."""
        collection = self._get_collection("odds")
        if collection is None: return None
        try:
            return collection.find_one({"fixture_id": fixture_id})
        except PyMongoError as e:
            logger.error(f"Error getting odds data for fixture {fixture_id}: {e}")
            return None
            
    def save_ml_ready_data_bulk(self, documents: List[Dict[str, Any]]) -> bool:
        """Saves a batch of ML-ready documents."""
        if not documents:
            return True
        collection = self._get_collection("ml_ready_data")
        if collection is None: return False
        try:
            # Using fixture_id for upserting
            operations = [
                UpdateOne({"fixture_id": doc["fixture_id"]}, {"$set": doc}, upsert=True)
                for doc in documents if "fixture_id" in doc
            ]
            if not operations:
                logger.warning("No valid documents with fixture_id to save in bulk.")
                return False
            collection.bulk_write(operations)
            logger.info(f"Bulk saved {len(operations)} ML-ready documents.")
            return True
        except PyMongoError as e:
            logger.error(f"Error bulk saving ML-ready data: {e}")
            return False

    def save_matches_for_frontend(self, matches: List[Dict[str, Any]]) -> bool:
        """Saves a batch of matches formatted for the frontend."""
        if not matches:
            return True
        collection = self._get_collection("matches")
        if collection is None: return False
        try:
            operations = [
                UpdateOne({"_id": match["_id"]}, {"$set": match}, upsert=True)
                for match in matches if "_id" in match
            ]
            if not operations:
                logger.warning("No valid matches with _id to save for frontend.")
                return False
            collection.bulk_write(operations)
            logger.info(f"Bulk saved {len(operations)} matches for the frontend.")
            return True
        except PyMongoError as e:
            logger.error(f"Error bulk saving frontend matches: {e}")
            return False


# Create a single instance of the manager to be used across the application
db_manager = MongoDBManager() 