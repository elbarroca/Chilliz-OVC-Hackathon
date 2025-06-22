import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
import sys
from pathlib import Path
import json

# Add project root to system path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from football_data.endpoints.game_scraper import GameScraper
from football_data.endpoints.match_processor import MatchProcessor
from football_data.score_data.extract_daily_games import DailyDataPreparer
from football_data.score_data.predict_games import (
    process_fixture_json, 
    calculate_strength_adjusted_lambdas,
    run_monte_carlo_simulation,
    calculate_weighted_strength_lambdas,
    calculate_analytical_poisson_probs,
    calculate_elo_probabilities,
    get_league_goal_covariance_lambda3,
    calculate_bivariate_poisson_probs,
    calculate_combined_top_selections,
    safe_get,
    MC_MAX_SCORE_PLOT,
    TOP_N_SCENARIOS
)
from football_data.get_data.api_football.db_mongo import db_manager
from football_data.endpoints.fixture_details import FixtureDetailsFetcher
from football_data.endpoints.team_fixtures import TeamFixturesFetcher
from football_data.endpoints.odds_fetcher import OddsFetcher
from football_data.get_data.api_football.league_id_mappings import LEAGUE_ID_MAPPING
from football_data.api.market_mapper import MARKET_MAPPING

logger = logging.getLogger(__name__)

# GB predictor removed as requested

def process_fixture_from_db_data(match_processor_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Process fixture data directly from database (match_processor collection) to generate predictions.
    This is a simplified version of process_fixture_json that works with database data.
    """
    try:
        fixture_id = match_processor_data.get("fixture_id", "N/A")
        home_team_name = safe_get(match_processor_data, ['home_team_name'], 'Home')
        away_team_name = safe_get(match_processor_data, ['away_team_name'], 'Away')
        
        logger.info(f"Processing Fixture ID: {fixture_id} ({home_team_name} vs {away_team_name})")
        
        # Debug: Log the structure of the data we're getting
        logger.debug(f"Match processor data keys: {list(match_processor_data.keys())}")
        if 'raw_data' in match_processor_data:
            logger.debug(f"Raw data keys: {list(match_processor_data['raw_data'].keys())}")
        
        results = {
            "fixture_id": fixture_id,
            "home_team": home_team_name,
            "away_team": away_team_name,
            "mc_probs": None,
            "mc_score_probs": None,
            "lambdas_original": (None, None),
            "lambdas_weighted": (None, None),
            "analytical_poisson_probs": None,
            "elo_probs": None,
            "bivariate_poisson_probs": None,
            "top_n_combined_selections": None,
            "gb_probs": None,  # Add Gradient Boosting predictions
        }

        # Original Monte Carlo Simulation
        lambdas_orig = calculate_strength_adjusted_lambdas(match_processor_data)
        results["lambdas_original"] = lambdas_orig

        if lambdas_orig[0] is not None and lambdas_orig[1] is not None:
            mc_scenario_results_dict, mc_score_results_dict = run_monte_carlo_simulation(
                lambdas_orig[0], lambdas_orig[1]
            )
            if mc_scenario_results_dict is not None:
                results["mc_probs"] = mc_scenario_results_dict
            else:
                logger.error(f"Failed Monte Carlo scenario simulation for {fixture_id}")

            if mc_score_results_dict is not None:
                results["mc_score_probs"] = mc_score_results_dict
            else:
                logger.error(f"Failed Monte Carlo scoreline simulation for {fixture_id}")
        else:
            logger.error(f"Failed to calculate original strength-adjusted lambdas for MC simulation for {fixture_id}")

        # Weighted Lambdas
        lambdas_w = calculate_weighted_strength_lambdas(match_processor_data)
        results["lambdas_weighted"] = lambdas_w

        # Analytical Poisson
        if lambdas_orig[0] is not None and lambdas_orig[1] is not None:
            results["analytical_poisson_probs"] = calculate_analytical_poisson_probs(
                lambdas_orig[0], lambdas_orig[1], max_goals=MC_MAX_SCORE_PLOT
            )
        else:
            logger.warning("Skipping analytical Poisson due to missing original lambdas.")

        # Elo Probabilities
        home_elo = safe_get(match_processor_data, ['engineered_features', 'home', 'elo_rating'])
        away_elo = safe_get(match_processor_data, ['engineered_features', 'away', 'elo_rating'])
        results["elo_probs"] = calculate_elo_probabilities(home_elo, away_elo)

        # GB predictions removed as requested

        # Bivariate Poisson
        if lambdas_orig[0] is not None and lambdas_orig[1] is not None:
            lambda3 = get_league_goal_covariance_lambda3(match_processor_data)
            valid_lambda3 = False
            try:
                if lambda3 >= 0 and lambda3 <= lambdas_orig[0] and lambda3 <= lambdas_orig[1]:
                    valid_lambda3 = True
            except TypeError:
                valid_lambda3 = False

            if valid_lambda3:
                results["bivariate_poisson_probs"] = calculate_bivariate_poisson_probs(
                    lambdas_orig[0], lambdas_orig[1], lambda3, max_goals=MC_MAX_SCORE_PLOT
                )
            else:
                l0_disp = f"{lambdas_orig[0]:.3f}" if lambdas_orig[0] is not None else "N/A"
                l1_disp = f"{lambdas_orig[1]:.3f}" if lambdas_orig[1] is not None else "N/A"
                l3_disp = f"{lambda3:.3f}" if lambda3 is not None else "N/A"
                logger.warning(f"Skipping Bivariate Poisson: Invalid lambda combination (L0={l0_disp}, L1={l1_disp}, L3={l3_disp}).")
        else:
            logger.warning("Skipping Bivariate Poisson due to missing original lambdas.")

        # Calculate Combined Top Selections
        results["top_n_combined_selections"] = calculate_combined_top_selections(
            results["mc_probs"],
            results["analytical_poisson_probs"],
            results["bivariate_poisson_probs"],
            top_n=TOP_N_SCENARIOS
        )

        logger.info(f"Successfully processed fixture {fixture_id}")
        return results

    except Exception as e:
        logger.error(f"Error processing fixture data: {e}", exc_info=True)
        return None

async def run_data_fetching(target_date: datetime):
    """
    Orchestrates the data fetching part of the pipeline for a given date.
    """
    logger.info(f"--- Running Data Fetching for {target_date.strftime('%Y-%m-%d')} ---")
    
    # 1. Scrape Games (always do this to get latest fixture list)
    scraper = GameScraper()
    date_str = target_date.strftime('%Y-%m-%d')
    scraper.get_games(target_date)
    fixture_ids = db_manager.get_match_fixture_ids_for_date(date_str)

    if not fixture_ids:
        logger.warning(f"No fixtures found for {date_str}. Halting data fetching.")
        return {"status": "warning", "message": "No fixtures found for the given date."}

    logger.info(f"Found {len(fixture_ids)} fixtures to process.")

    # Instantiate fetchers
    match_processor = MatchProcessor()
    fixture_details_fetcher = FixtureDetailsFetcher(db_manager_instance=db_manager)
    team_fixtures_fetcher = TeamFixturesFetcher()
    odds_fetcher = OddsFetcher()

    # Filter for priority fixtures and check which ones need processing
    priority_fixtures_data = []
    cached_fixtures = 0
    
    for fixture_id in fixture_ids:
        match_data = db_manager.get_match_data(str(fixture_id))
        if match_data:
            league_id = match_data.get('league_id', '')
            if any(info["mongodb_id"] == league_id for info in LEAGUE_ID_MAPPING.values()):
                # Check if this fixture already has processed data (caching logic)
                if db_manager.check_match_processor_data_exists(str(fixture_id)):
                    cached_fixtures += 1
                    logger.debug(f"Match processor data already exists for fixture {fixture_id}, skipping.")
                else:
                    priority_fixtures_data.append(match_data)

    logger.info(f"Found {cached_fixtures} cached fixtures, {len(priority_fixtures_data)} need processing.")

    if not priority_fixtures_data and cached_fixtures > 0:
        logger.info("All priority fixtures already have processed data. Skipping match processing.")
        # Still fetch odds for all fixtures (odds can change)
        all_priority_fixture_ids = [
            int(match_data['fixture_id']) for fixture_id in fixture_ids
            if (match_data := db_manager.get_match_data(str(fixture_id))) and
            any(info["mongodb_id"] == match_data.get('league_id', '') for info in LEAGUE_ID_MAPPING.values())
        ]
        logger.info(f"Fetching odds for {len(all_priority_fixture_ids)} fixtures (odds can change).")
        await odds_fetcher.process_fixtures_odds(fixture_ids=all_priority_fixture_ids, force_reprocess=False)
        return {"status": "success", "cached_fixtures": cached_fixtures, "processed_fixture_ids": all_priority_fixture_ids}

    logger.info(f"Processing {len(priority_fixtures_data)} priority fixtures.")

    # 2. Process each match (enrich, backfill history) - only for non-cached fixtures
    processing_tasks = [
        run_match_processing_for_fixture(match_processor, fixture_details_fetcher, team_fixtures_fetcher, data)
        for data in priority_fixtures_data
    ]
    results = await asyncio.gather(*processing_tasks)
    processed_fixture_ids = [fid for fid in results if fid is not None]

    if not processed_fixture_ids and cached_fixtures == 0:
        logger.warning("No fixtures were successfully processed. Halting.")
        return {"status": "warning", "message": "No priority fixtures could be processed."}

    # 3. Fetch odds for all priority fixtures (both newly processed and cached)
    all_priority_fixture_ids = processed_fixture_ids.copy()
    for fixture_id in fixture_ids:
        match_data = db_manager.get_match_data(str(fixture_id))
        if match_data:
            league_id = match_data.get('league_id', '')
            if any(info["mongodb_id"] == league_id for info in LEAGUE_ID_MAPPING.values()):
                fid = int(match_data['fixture_id'])
                if fid not in all_priority_fixture_ids:
                    all_priority_fixture_ids.append(fid)

    logger.info(f"Fetching odds for {len(all_priority_fixture_ids)} total fixtures.")
    await odds_fetcher.process_fixtures_odds(fixture_ids=all_priority_fixture_ids, force_reprocess=False)
    
    logger.info("--- Data Fetching Complete ---")
    return {
        "status": "success", 
        "new_processed_fixtures": len(processed_fixture_ids),
        "cached_fixtures": cached_fixtures,
        "total_fixtures": len(all_priority_fixture_ids),
        "processed_fixture_ids": all_priority_fixture_ids
    }


async def run_prediction_generation(target_date: datetime):
    """
    Orchestrates the prediction generation part of the pipeline for a given date.
    """
    logger.info(f"--- Running Prediction Generation for {target_date.strftime('%Y-%m-%d')} ---")
    
    date_str = target_date.strftime('%Y-%m-%d')
    
    # 1. Check for existing predictions (caching logic)
    fixture_ids = db_manager.get_match_fixture_ids_for_date(date_str)
    existing_predictions = 0
    missing_predictions = []
    
    for fixture_id in fixture_ids:
        if db_manager.check_prediction_exists(str(fixture_id)):
            existing_predictions += 1
            logger.debug(f"Prediction already exists for fixture {fixture_id}, skipping.")
        else:
            missing_predictions.append(fixture_id)
    
    if existing_predictions > 0:
        logger.info(f"Found {existing_predictions} existing predictions, {len(missing_predictions)} missing.")
    
    if not missing_predictions:
        logger.info("All predictions already exist for this date. Skipping prediction generation.")
        return {"status": "success", "message": "All predictions already cached", "cached_predictions": existing_predictions}
    
    # 2. Extract fixture IDs for the date (this replaces the unified data files approach)
    extractor = DailyDataPreparer()
    fixture_ids_for_prediction = extractor.extract_fixture_ids_for_date(date_str)
    
    if not fixture_ids_for_prediction:
        logger.warning("No fixture IDs found for prediction generation.")
        return {"status": "warning", "message": "No fixture IDs were available for prediction."}

    # 3. Run predictions directly on fixture IDs (skip file creation)
    new_predictions = 0
    
    for fixture_id in missing_predictions:
        try:
            logger.info(f"Processing prediction for fixture {fixture_id}")
            
            # Get match processor data for this fixture
            match_processor_data = db_manager.get_match_processor_data(str(fixture_id))
            if not match_processor_data:
                logger.warning(f"No match processor data found for fixture {fixture_id}, skipping.")
                continue
            
            # Process prediction directly from database data
            prediction_data = process_fixture_from_db_data(match_processor_data)
            if prediction_data:
                # Save prediction to database
                db_manager.save_prediction_results(prediction_data)
                new_predictions += 1
                logger.info(f"Saved new prediction for fixture {fixture_id}")
            else:
                logger.warning(f"Failed to generate prediction for fixture {fixture_id}")
                    
        except Exception as e:
            logger.error(f"Error predicting for fixture {fixture_id}: {e}", exc_info=True)

    logger.info(f"Generated {new_predictions} new predictions. {existing_predictions} were already cached.")
    logger.info("--- Prediction Generation Complete ---")
    return {
        "status": "success", 
        "new_predictions": new_predictions,
        "cached_predictions": existing_predictions,
        "total_predictions": new_predictions + existing_predictions,
        "processed_fixtures": missing_predictions[:new_predictions] if new_predictions > 0 else []
    }


async def run_prediction_generation_and_save(target_date: datetime):
    """
    Orchestrates the prediction generation part of the pipeline, saves the results,
    and returns a summary.
    """
    logger.info(f"--- Running Prediction Generation for {target_date.strftime('%Y-%m-%d')} ---")
    date_str = target_date.strftime('%Y-%m-%d')
    
    # 1. Get all fixture IDs for the date that have been processed.
    fixture_ids = db_manager.get_processed_fixture_ids_for_date(date_str)
    
    if not fixture_ids:
        logger.warning(f"No processed fixtures found for {date_str} to generate predictions.")
        return {"status": "warning", "message": "No processed fixtures found."}

    logger.info(f"Found {len(fixture_ids)} processed fixtures to generate predictions for.")
    
    prediction_results = []
    cached_predictions = 0

    for fixture_id in fixture_ids:
        # 2. Check if predictions already exist for this fixture (caching logic)
        if db_manager.check_prediction_exists(str(fixture_id)):
            logger.debug(f"Prediction for fixture {fixture_id} already exists. Skipping.")
            cached_predictions += 1
            continue

        match_processor_data = db_manager.get_match_processor_data(str(fixture_id))
        if not match_processor_data:
            logger.warning(f"Could not retrieve match processor data for {fixture_id}. Skipping prediction.")
            continue
            
        # 3. Process the fixture data to generate predictions
        prediction_output = process_fixture_from_db_data(match_processor_data)
        
        if prediction_output:
            # 4. Save individual prediction results to the database
            db_manager.save_prediction_results(prediction_output)
            prediction_results.append(prediction_output)
            logger.info(f"Successfully generated and saved prediction for fixture {fixture_id}")
        else:
            logger.error(f"Failed to generate prediction for fixture {fixture_id}")
            
    # 5. Transform and load data for the frontend
    # This step might need to be adjusted based on the final format.
    # It currently expects file paths, but we have data in memory.
    # For now, we adapt it to save the structured data.
    if prediction_results:
        logger.info("Transforming prediction data for frontend...")
        transform_and_load_for_frontend_from_data(prediction_results)

    summary = {
        "status": "success",
        "new_predictions_generated": len(prediction_results),
        "cached_predictions": cached_predictions,
        "total_fixtures_for_date": len(fixture_ids)
    }
    logger.info(f"--- Prediction Generation Complete --- Summary: {summary}")
    return summary


async def backfill_team_history(
    team_id: int, 
    season: int, 
    match_date: datetime,
    team_fixtures_fetcher: TeamFixturesFetcher, 
    fixture_details_fetcher: FixtureDetailsFetcher
) -> List[Dict]:
    """
    Checks for a team's historical matches in the DB. If insufficient, fetches
    fixture lists and their details to backfill the 'matches' collection.
    Returns the historical match data.
    """
    history = db_manager.get_historical_matches(team_id, match_date, limit=15)
    
    if len(history) < 10:
        logger.info(f"Insufficient history for team {team_id} ({len(history)} matches found). Backfilling...")
        
        team_fixtures_data = team_fixtures_fetcher.get_team_fixtures_from_api(team_id, season)
        
        if team_fixtures_data:
            # Filter for fixtures that happened before the current match date
            relevant_fixtures = [
                fix for fix in team_fixtures_data
                if 'fixture' in fix and 'date' in fix['fixture'] and 
                   datetime.fromisoformat(fix['fixture']['date'].replace('Z', '+00:00')) < match_date
            ]
            
            # Sort by date to get the most recent ones
            relevant_fixtures.sort(key=lambda x: x['fixture']['date'], reverse=True)
            
            # We only need to check the last ~20 to ensure we have enough history
            fixtures_to_check = relevant_fixtures[:20]

            missing_fixture_ids = [
                f['fixture']['id'] for f in fixtures_to_check 
                if 'fixture' in f and 'id' in f['fixture'] and not db_manager.check_match_exists(str(f['fixture']['id']))
            ]

            if missing_fixture_ids:
                logger.info(f"Fetching details for {len(missing_fixture_ids)} missing historical fixtures for team {team_id}.")
                for fid in missing_fixture_ids:
                    # This is a synchronous call, which is fine for now but could be optimized
                    fixture_details_fetcher.get_fixture_details(fid)
            
            # After backfilling, get the history again
            history = db_manager.get_historical_matches(team_id, match_date, limit=15)
            logger.info(f"Found {len(history)} matches for team {team_id} after backfilling.")
            
    return history

# Helper function (a slimmed-down version of what's in run_pipeline.py)
async def run_match_processing_for_fixture(
    match_processor: MatchProcessor,
    fixture_details_fetcher: FixtureDetailsFetcher,
    team_fixtures_fetcher: TeamFixturesFetcher,
    fixture_data: dict
):
    """
    Asynchronously processes a single fixture.
    """
    try:
        fixture_id = int(fixture_data['fixture_id'])
        league_id = int(fixture_data['league_id'])
        home_team_id = int(fixture_data['home_team']['id'])
        away_team_id = int(fixture_data['away_team']['id'])
        home_team_name = fixture_data['home_team']['name']
        away_team_name = fixture_data['away_team']['name']
        match_date = datetime.fromisoformat(fixture_data['match_info']['date'].replace('Z', '+00:00'))
        
        season = fixture_data.get('standings', {}).get('league', {}).get('season')
        if not isinstance(season, int):
            season = datetime.now().year if match_date.month < 8 else datetime.now().year -1

        logger.info(f"Processing fixture ID: {fixture_id} (Season: {season})")

        fixture_details_fetcher.get_fixture_details(fixture_id)
        
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

        if not api_data:
            logger.warning(f"Could not fetch processable data for fixture {fixture_id}. Skipping.")
            return None

        home_history = await backfill_team_history(home_team_id, season, match_date, team_fixtures_fetcher, fixture_details_fetcher)
        away_history = await backfill_team_history(away_team_id, season, match_date, team_fixtures_fetcher, fixture_details_fetcher)

        api_data['home_team_history'] = home_history
        api_data['away_team_history'] = away_history
        
        api_data['fixture_id'] = fixture_id
        api_data['match_date_str'] = match_date.strftime('%Y-%m-%d')
        db_manager.save_match_processor_data(api_data)
        logger.info(f"Successfully processed and saved all data for fixture {fixture_id} to 'match_processor'.")
        return fixture_id
        
    except Exception as e:
        logger.error(f"Error processing fixture in orchestrator {fixture_data.get('fixture_id', 'N/A')}: {e}", exc_info=True)
        return None 

async def run_edge_analysis(date: datetime):
    """
    Analyzes predictions and odds to find value bets for a given date.
    """
    logger.info(f"--- Running Edge Analysis for {date.strftime('%Y-%m-%d')} ---")
    date_str = date.strftime('%Y-%m-%d')
    
    try:
        from football_data.score_data.edge_analyzer import EdgeAnalyzer
        
        # Initialize the edge analyzer
        analyzer = EdgeAnalyzer(bookmaker_name="Bet365")
        
        # Get all fixture IDs for the given date
        fixture_ids = db_manager.get_match_fixture_ids_for_date(date_str)
        
        if not fixture_ids:
            logger.warning(f"No fixtures found for {date_str}")
            return {"status": "warning", "message": "No fixtures found for the given date"}
        
        # Collect fixture data with predictions and odds
        fixtures_data = []
        
        for fixture_id in fixture_ids:
            # Fetch predictions and odds from the database
            prediction_data = db_manager.get_prediction_results(str(fixture_id))
            odds_data = db_manager.get_odds_data(str(fixture_id))
            
            if prediction_data and odds_data:
                fixtures_data.append({
                    "fixture_id": str(fixture_id),
                    "predictions": prediction_data,
                    "odds": odds_data
                })
            else:
                logger.debug(f"Skipping fixture {fixture_id}: Missing prediction or odds data")
        
        if not fixtures_data:
            logger.warning(f"No fixtures with both predictions and odds found for {date_str}")
            return {"status": "warning", "message": "No fixtures with complete data found"}
        
        # Run the edge analysis
        analysis_results = analyzer.analyze_date(date_str, fixtures_data)
        
        logger.info(f"Edge analysis complete for {date_str}: {analysis_results['total_value_bets']} value bets found")
        
        return {
            "status": "success",
            "analysis": analysis_results
        }
        
    except Exception as e:
        logger.error(f"Error during edge analysis for {date_str}: {e}", exc_info=True)
        return {
            "status": "error",
            "message": f"Edge analysis failed: {str(e)}"
        } 

async def run_full_pipeline(date: datetime):
    """
    Runs the full data pipeline: fetches new data, then generates predictions.
    """
    logger.info(f"--- Starting Full Pipeline for {date.strftime('%Y-%m-%d')} ---")
    
    # Step 1: Fetch all required data for the day's matches.
    # This function now includes caching logic.
    fetch_summary = await run_data_fetching(date)
    logger.info(f"Data fetching summary: {fetch_summary}")
    
    # Step 2: Generate predictions for all processed matches for the day.
    # This function also includes caching logic.
    prediction_summary = await run_prediction_generation_and_save(date)
    logger.info(f"Prediction generation summary: {prediction_summary}")
    
    logger.info(f"--- Full Pipeline Finished for {date.strftime('%Y-%m-%d')} ---")
    
    return {
        "pipeline_status": "completed",
        "date": date.strftime('%Y-%m-%d'),
        "data_fetching": fetch_summary,
        "prediction_generation": prediction_summary
    }

def transform_and_load_for_frontend_from_data(prediction_results: list):
    """
    Transforms prediction outputs into the format expected by the frontend
    and loads it into the 'matches' collection, using data directly.
    """
    if not prediction_results:
        logger.warning("No prediction results to transform for frontend.")
        return

    logger.info(f"Transforming {len(prediction_results)} predictions for the frontend.")
    
    matches_to_load = []
    for data in prediction_results:
        try:
            fixture_id = data.get("fixture_id")
            if not fixture_id:
                logger.warning(f"Skipping prediction, missing fixture_id.")
                continue
            
            # We need to fetch the original match_processor_data to get all details
            match_processor_data = db_manager.get_match_processor_data(str(fixture_id))
            if not match_processor_data:
                 logger.warning(f"Could not get match_processor_data for fixture {fixture_id} to transform.")
                 continue

            mc_probs = data.get("mc_probs")
            if not mc_probs:
                logger.warning(f"Skipping fixture {fixture_id}, missing mc_probs for alphaPredictions.")
                continue

            match_doc = {
                "matchId": int(fixture_id),
                "teamA": {
                    "name": data.get("home_team", "N/A"),
                    "slug": data.get("home_team", "n-a").lower().replace(" ", "-"),
                    "logoUrl": safe_get(match_processor_data, ["raw_data", "home", "basic_info", "logo"], "")
                },
                "teamB": {
                    "name": data.get("away_team", "N/A"),
                    "slug": data.get("away_team", "n-a").lower().replace(" ", "-"),
                    "logoUrl": safe_get(match_processor_data, ["raw_data", "away", "basic_info", "logo"], "")
                },
                "matchTime": safe_get(match_processor_data, ["fixture_data", "fixture_meta", "date_utc"]),
                "league": safe_get(match_processor_data, ["fixture_data", "league", "name"]),
                "status": 'UPCOMING',
                "alphaPredictions": {
                    "winA_prob": mc_probs.get("prob_H", 0),
                    "draw_prob": mc_probs.get("prob_D", 0),
                    "winB_prob": mc_probs.get("prob_A", 0),
                }
            }
            # Using updateOne with upsert=True to not overwrite existing fields
            db_manager._matches_collection.update_one(
                {"matchId": int(fixture_id)},
                {"$set": match_doc},
                upsert=True
            )
        except Exception as e:
            logger.error(f"Error transforming prediction for fixture {fixture_id}: {e}", exc_info=True)

    logger.info(f"Finished transforming and loading {len(prediction_results)} matches to the 'matches' collection.")


def transform_and_load_for_frontend(prediction_files: list):
    """Transforms and loads prediction data for the frontend."""
    if not prediction_files:
        return

    matches_to_load = []
    for file_path in prediction_files:
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)

            fixture_id = data.get("fixture_id")
            if not fixture_id or not data.get("mc_probs"):
                continue

            match_doc = {
                "_id": str(fixture_id), "matchId": int(fixture_id),
                "teamA": {"name": data.get("home_team", "N/A"), "slug": data.get("home_team", "n-a").lower().replace(" ", "-"), "logoUrl": safe_get(data, ["fixture_data", "raw_data", "home", "basic_info", "logo"], "")},
                "teamB": {"name": data.get("away_team", "N/A"), "slug": data.get("away_team", "n-a").lower().replace(" ", "-"), "logoUrl": safe_get(data, ["fixture_data", "raw_data", "away", "basic_info", "logo"], "")},
                "matchTime": safe_get(data, ["fixture_data", "fixture_meta", "date_utc"]),
                "league": safe_get(data, ["fixture_data", "league", "name"]),
                "status": 'UPCOMING',
                "alphaPredictions": {
                    "winA_prob": data["mc_probs"].get("prob_H", 0),
                    "draw_prob": data["mc_probs"].get("prob_D", 0),
                    "winB_prob": data["mc_probs"].get("prob_A", 0),
                }
            }
            matches_to_load.append(match_doc)
        except Exception as e:
            logger.error(f"Error transforming file {file_path}: {e}", exc_info=True)

    if matches_to_load:
        db_manager.save_matches_for_frontend(matches_to_load) 