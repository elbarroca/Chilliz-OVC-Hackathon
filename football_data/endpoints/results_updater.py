# football_data/endpoints/results_updater.py

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Coroutine
import asyncio

# Local imports - ensure correct pathing
from football_data.get_data.api_football.db_mongo import db_manager
from football_data.endpoints.fixture_details import FixtureDetailsFetcher
from football_data.endpoints.api_manager import api_manager

logger = logging.getLogger(__name__)

class ResultsUpdater:
    """
    Handles fetching and processing final results for recently finished matches.
    """
    def __init__(self):
        """Initializes the ResultsUpdater."""
        self.db_manager = db_manager
        # Ensure the API manager is initialized before the fixture fetcher uses it
        if not self.db_manager.is_initialized():
            logger.info("DB Manager not initialized. Initializing now.")
            self.db_manager.__init__()
            
        self.fixture_fetcher = FixtureDetailsFetcher(db_manager_instance=self.db_manager)
        
        # Match Status Constants
        self.FINISHED_STATUSES = ["FT", "AET", "PEN"]
        self.IN_PLAY_STATUSES = ["1H", "HT", "2H", "ET", "BT", "P", "INT"]
        self.CANCELLED_STATUSES = ["CANC", "ABD", "PST", "SUSP"]

    def _get_candidate_fixtures(self) -> List[int]:
        """
        Gets fixture IDs that are due for a result check from the queue.
        This method now relies on the new dynamic queueing system.
        """
        logger.info("Fetching due fixtures from the result check queue...")
        return self.db_manager.get_due_result_checks()

    def _process_finished_fixture(self, fixture_id: int, fixture_data: Dict[str, Any]):
        """
        Processes a finished fixture, calculates outcomes, and saves to the new collection.
        """
        logger.info(f"Processing finished fixture: {fixture_id}")
        
        goals = fixture_data.get('fixture_details', {}).get('goals', {})
        home_goals = goals.get('home')
        away_goals = goals.get('away')

        if home_goals is None or away_goals is None:
            logger.warning(f"Could not find goals for finished fixture {fixture_id}. Skipping.")
            return

        # Determine outcomes
        if home_goals > away_goals: outcome = "HOME_WIN"
        elif away_goals > home_goals: outcome = "AWAY_WIN"
        else: outcome = "DRAW"
            
        both_teams_scored = home_goals > 0 and away_goals > 0
        total_goals = home_goals + away_goals
        over_2_5_goals = total_goals > 2.5
        
        result_doc = {
            "_id": str(fixture_id),
            "fixture_id": fixture_id,
            "final_score": {"home": home_goals, "away": away_goals},
            "outcome": outcome,
            "both_teams_scored": both_teams_scored,
            "over_2_5_goals": over_2_5_goals,
            "status": fixture_data.get("fixture_details", {}).get("fixture", {}).get("status", {}).get("short"),
            "processed_at_utc": datetime.now(timezone.utc)
        }

        # Save to the new 'match_results' collection
        self.db_manager.save_match_result(result_doc)

    async def run_update(self) -> Dict[str, Any]:
        """
        Main method to run the results update process. It fetches candidate fixtures,
        updates their status, and processes them if finished.
        """
        logger.info("Starting results update process...")
        
        # Ensure API Manager is ready
        if not api_manager.is_initialized():
            api_manager.initialize()

        candidate_fixtures = self._get_candidate_fixtures()

        if not candidate_fixtures:
            logger.info("No candidate fixtures to update at this time.")
            return {"status": "success", "updated": 0, "checked": 0}

        logger.info(f"Found {len(candidate_fixtures)} candidate fixtures to check.")
        updated_count = 0
        
        tasks: List[Coroutine] = []
        for fixture_id in candidate_fixtures:
            # The get_fixture_details is synchronous, but we can wrap it
            tasks.append(self._update_and_process_fixture(fixture_id))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for res in results:
            if isinstance(res, bool) and res:
                updated_count += 1
            elif isinstance(res, Exception):
                logger.error(f"An error occurred during fixture update: {res}", exc_info=False)

        logger.info(f"Results update process finished. Checked {len(candidate_fixtures)}, updated {updated_count} results.")
        return {"status": "success", "updated": updated_count, "checked": len(candidate_fixtures)}

    async def _update_and_process_fixture(self, fixture_id: int) -> bool:
        """
        Helper coroutine to update a single fixture and process it if finished.
        """
        try:
            # get_fixture_details will fetch and save the latest data to 'matches'
            latest_fixture_data = self.fixture_fetcher.get_fixture_details(fixture_id)

            if not latest_fixture_data:
                logger.warning(f"Could not fetch latest details for fixture {fixture_id}.")
                return False

            status = latest_fixture_data.get("fixture_details", {}).get("fixture", {}).get("status", {}).get("short")
            if status in self.FINISHED_STATUSES:
                self._process_finished_fixture(fixture_id, latest_fixture_data)
                return True
            return False
        except Exception as e:
            logger.error(f"Error processing fixture {fixture_id} in helper: {e}", exc_info=True)
            return False 