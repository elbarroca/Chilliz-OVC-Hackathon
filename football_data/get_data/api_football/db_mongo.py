import os
import logging
from pymongo import MongoClient, errors
from pymongo.collection import Collection
from pymongo.database import Database
from typing import Dict, Any, Optional, List
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MongoDBManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MongoDBManager, cls).__new__(cls)
        return cls._instance

    def __init__(self, uri: Optional[str] = None, db_name: Optional[str] = None):
        if hasattr(self, '_initialized') and self._initialized:
            return

        self.client: Optional[MongoClient] = None
        self.db: Optional[Database] = None
        self._initialized = False

        try:
            mongo_uri = uri or os.getenv('MONGODB_URI')
            database_name = db_name or os.getenv('DB_NAME')

            if not mongo_uri or not database_name:
                logger.error("MONGODB_URI and DB_NAME environment variables must be set.")
                raise ValueError("MONGODB_URI and DB_NAME are not configured.")

            self.client = MongoClient(mongo_uri)
            self.db = self.client[database_name]
            
            # Test the connection
            self.client.server_info()
            self._initialized = True
            logger.info(f"✅ Successfully connected to MongoDB. DB: '{database_name}'")

        except errors.ConnectionFailure as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            self.client = None
            self.db = None
        except Exception as e:
            logger.error(f"❌ An error occurred during MongoDB initialization: {e}")
            self.client = None
            self.db = None

    def close_connection(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    def get_collection(self, collection_name: str) -> Optional[Collection]:
        if not self.db:
            logger.error("Database not initialized.")
            return None
        return self.db[collection_name]

    def save_document(self, collection_name: str, document: Dict[str, Any], afilter: Dict[str, Any]):
        """Saves a document to a collection, updating if it exists."""
        collection = self.get_collection(collection_name)
        if collection is None:
            return False
        try:
            collection.update_one(afilter, {'$set': document}, upsert=True)
            return True
        except Exception as e:
            logger.error(f"Error saving document to {collection_name}: {e}")
            return False

    def save_match_data(self, match_data: Dict[str, Any]) -> bool:
        """Saves raw fixture data scraped from the API."""
        if 'fixture_id' not in match_data:
            logger.error("match_data must contain a 'fixture_id'")
            return False
        fixture_id = str(match_data['fixture_id'])
        return self.save_document('matches', match_data, {'fixture_id': fixture_id})

    def get_match_data(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single match document by its fixture ID."""
        collection = self.get_collection('matches')
        if not collection:
            return None
        return collection.find_one({'fixture_id': fixture_id})

    def get_match_fixture_ids_for_date(self, date_str: str) -> List[int]:
        """Gets all fixture IDs for a given date string (YYYY-MM-DD)."""
        collection = self.get_collection('matches')
        if not collection:
            return []
        
        # This assumes the date is stored in a field like 'date_str' or part of a datetime object.
        # Adjust the query based on the actual schema. For example, if using 'match_info.date'.
        # This is a simplified query.
        cursor = collection.find(
            {'date_str': date_str},
            {'fixture_id': 1}
        )
        return [int(doc['fixture_id']) for doc in cursor if 'fixture_id' in doc]


    def save_match_processor_data(self, fixture_id: int, data: Dict[str, Any]):
        """Saves the output from the MatchProcessor."""
        return self.save_document('match_processor_data', data, {'fixture_id': str(fixture_id)})

    def get_match_processor_data(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves data for a fixture from the match_processor_data collection."""
        collection = self.get_collection('match_processor_data')
        if not collection:
            return None
        return collection.find_one({'fixture_id': fixture_id})

    def check_ml_ready_data_exists(self, fixture_id: str) -> bool:
        """Checks if ML-ready data exists for a fixture."""
        collection = self.get_collection('ml_ready_data')
        if not collection:
            return False
        return collection.count_documents({'fixture_id': fixture_id}) > 0
        
    def get_historical_matches(self, team_id: int, before_date: datetime, limit: int = 15) -> List[Dict[str, Any]]:
        """Gets historical matches for a team before a certain date."""
        collection = self.get_collection('matches')
        if not collection:
            return []
        
        query = {
            '$or': [{'home_team.id': team_id}, {'away_team.id': team_id}],
            'match_info.date': {'$lt': before_date.isoformat()}
        }
        
        cursor = collection.find(query).sort('match_info.date', -1).limit(limit)
        return list(cursor)

    def save_team_season_fixture_list(self, team_id: int, season: int, fixture_ids: List[int]) -> bool:
        """Saves the list of all fixture IDs for a team for an entire season."""
        doc = {
            'team_id': team_id,
            'season': season,
            'fixture_ids': fixture_ids,
            'last_updated': datetime.utcnow()
        }
        return self.save_document('team_season_fixtures', doc, {'team_id': team_id, 'season': season})
        
    def save_standings_data(self, date_str: str, league_id: str, season: int, standings_data: Dict[str, Any]) -> bool:
        """Saves standings data."""
        doc = {
            'date_str': date_str,
            'league_id': league_id,
            'season': season,
            'data': standings_data,
            'last_updated': datetime.utcnow()
        }
        return self.save_document('standings', doc, {'date_str': date_str, 'league_id': league_id, 'season': season})

    def save_odds_data(self, date_str: str, fixture_id: str, odds_data: Dict[str, Any]) -> bool:
        """Saves odds data for a fixture."""
        doc = {
            'date_str': date_str,
            'fixture_id': fixture_id,
            'data': odds_data,
            'last_updated': datetime.utcnow()
        }
        return self.save_document('odds', doc, {'fixture_id': fixture_id})

    def get_odds_data(self, fixture_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves odds data for a fixture."""
        collection = self.get_collection('odds')
        if not collection:
            return None
        return collection.find_one({'fixture_id': fixture_id})

    def get_daily_games(self, date_str: str) -> Optional[Dict[str, Any]]:
        """Retrieves the processed daily games document."""
        collection = self.get_collection('daily_games')
        if not collection:
            return None
        return collection.find_one({'date': date_str})


# Create a singleton instance of the manager
db_manager = MongoDBManager() 