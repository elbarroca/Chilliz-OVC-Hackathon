"""
Value Bet Finder for AlphaSteam Football Betting

This module finds value betting opportunities by analyzing stored predictions
against bookmaker odds from the MongoDB database.
"""

import logging
import sys
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

# Add project root to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from football_data.get_data.api_football.db_mongo import db_manager
from football_data.score_data.edge_analyzer import EdgeAnalyzer

logger = logging.getLogger(__name__)

class ValueBetFinder:
    """
    Finds value betting opportunities using stored predictions and odds.
    """
    
    def __init__(self, bookmaker_name: str = "Bet365"):
        self.bookmaker_name = bookmaker_name
        self.edge_analyzer = EdgeAnalyzer(bookmaker_name=bookmaker_name)
        
    def find_value_bets_for_date(self, date_str: str) -> Dict[str, Any]:
        """
        Find value bets for all fixtures on a given date.
        
        Args:
            date_str: Date in YYYY-MM-DD format
            
        Returns:
            Dictionary containing value bet analysis results
        """
        logger.info(f"Finding value bets for {date_str}")
        
        try:
            # Get all fixture IDs for the date
            fixture_ids = db_manager.get_match_fixture_ids_for_date(date_str)
            
            if not fixture_ids:
                logger.warning(f"No fixtures found for {date_str}")
                return {
                    "status": "warning",
                    "message": "No fixtures found for the given date",
                    "date": date_str,
                    "value_bets": []
                }
            
            logger.info(f"Found {len(fixture_ids)} fixtures for {date_str}")
            
            # Collect fixture data with predictions and odds
            fixtures_data = []
            missing_predictions = 0
            missing_odds = 0
            
            for fixture_id in fixture_ids:
                # Get predictions from database
                prediction_data = db_manager.get_prediction_results(str(fixture_id))
                if not prediction_data:
                    missing_predictions += 1
                    logger.debug(f"No predictions found for fixture {fixture_id}")
                    continue
                
                # Get odds from database
                odds_data = db_manager.get_odds_data(str(fixture_id))
                if not odds_data:
                    missing_odds += 1
                    logger.debug(f"No odds found for fixture {fixture_id}")
                    continue
                
                fixtures_data.append({
                    "fixture_id": str(fixture_id),
                    "predictions": prediction_data,
                    "odds": odds_data
                })
            
            logger.info(f"Found complete data for {len(fixtures_data)} fixtures")
            if missing_predictions > 0:
                logger.info(f"Missing predictions for {missing_predictions} fixtures")
            if missing_odds > 0:
                logger.info(f"Missing odds for {missing_odds} fixtures")
            
            if not fixtures_data:
                return {
                    "status": "warning",
                    "message": "No fixtures with complete prediction and odds data found",
                    "date": date_str,
                    "total_fixtures": len(fixture_ids),
                    "missing_predictions": missing_predictions,
                    "missing_odds": missing_odds,
                    "value_bets": []
                }
            
            # Run edge analysis
            analysis_results = self.edge_analyzer.analyze_date(date_str, fixtures_data)
            
            # Add metadata
            analysis_results.update({
                "status": "success",
                "total_fixtures": len(fixture_ids),
                "fixtures_analyzed": len(fixtures_data),
                "missing_predictions": missing_predictions,
                "missing_odds": missing_odds,
                "bookmaker": self.bookmaker_name
            })
            
            logger.info(f"Value bet analysis complete for {date_str}: {analysis_results['total_value_bets']} value bets found")
            
            return analysis_results
            
        except Exception as e:
            logger.error(f"Error finding value bets for {date_str}: {e}", exc_info=True)
            return {
                "status": "error",
                "message": f"Error during value bet analysis: {str(e)}",
                "date": date_str,
                "value_bets": []
            }
    
    def find_value_bets_for_fixture(self, fixture_id: str) -> Dict[str, Any]:
        """
        Find value bets for a specific fixture.
        
        Args:
            fixture_id: Fixture identifier
            
        Returns:
            Dictionary containing value bet analysis for the fixture
        """
        logger.info(f"Finding value bets for fixture {fixture_id}")
        
        try:
            # Get predictions from database
            prediction_data = db_manager.get_prediction_results(fixture_id)
            if not prediction_data:
                return {
                    "status": "error",
                    "message": f"No predictions found for fixture {fixture_id}",
                    "fixture_id": fixture_id,
                    "value_bets": []
                }
            
            # Get odds from database
            odds_data = db_manager.get_odds_data(fixture_id)
            if not odds_data:
                return {
                    "status": "error",
                    "message": f"No odds found for fixture {fixture_id}",
                    "fixture_id": fixture_id,
                    "value_bets": []
                }
            
            # Analyze this fixture
            value_bets = self.edge_analyzer.analyze_fixture(fixture_id, prediction_data, odds_data)
            
            return {
                "status": "success",
                "fixture_id": fixture_id,
                "home_team": prediction_data.get("home_team", "Unknown"),
                "away_team": prediction_data.get("away_team", "Unknown"),
                "total_value_bets": len(value_bets),
                "value_bets": value_bets,
                "bookmaker": self.bookmaker_name,
                "analysis_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error finding value bets for fixture {fixture_id}: {e}", exc_info=True)
            return {
                "status": "error",
                "message": f"Error during fixture analysis: {str(e)}",
                "fixture_id": fixture_id,
                "value_bets": []
            }
    
    def get_top_value_bets(self, date_str: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get the top value bets for a date, sorted by edge.
        
        Args:
            date_str: Date in YYYY-MM-DD format
            limit: Maximum number of bets to return
            
        Returns:
            List of top value bets
        """
        analysis_results = self.find_value_bets_for_date(date_str)
        
        if analysis_results.get("status") != "success":
            return []
        
        value_bets = analysis_results.get("value_bets", [])
        
        # Sort by edge (highest first) and limit
        top_bets = sorted(value_bets, key=lambda x: x.get("edge", 0), reverse=True)[:limit]
        
        return top_bets
    
    def save_value_bets_to_db(self, date_str: str) -> Dict[str, Any]:
        """
        Find value bets for a date and save them to the database.
        
        Args:
            date_str: Date in YYYY-MM-DD format
            
        Returns:
            Results of the save operation
        """
        logger.info(f"Finding and saving value bets for {date_str}")
        
        # Find value bets
        analysis_results = self.find_value_bets_for_date(date_str)
        
        if analysis_results.get("status") != "success":
            return analysis_results
        
        try:
            # Prepare data for saving
            betting_paper_data = {
                "date": date_str,
                "bookmaker": self.bookmaker_name,
                "analysis_results": analysis_results,
                "generated_at_utc": datetime.utcnow().isoformat(),
                "total_value_bets": analysis_results.get("total_value_bets", 0),
                "fixtures_analyzed": analysis_results.get("fixtures_analyzed", 0)
            }
            
            # Save to database using the betting papers collection
            success = db_manager.save_betting_papers(betting_paper_data)
            
            if success:
                logger.info(f"Successfully saved value bets for {date_str} to database")
                return {
                    "status": "success",
                    "message": f"Value bets saved to database for {date_str}",
                    "total_value_bets": analysis_results.get("total_value_bets", 0),
                    "date": date_str
                }
            else:
                logger.error(f"Failed to save value bets for {date_str} to database")
                return {
                    "status": "error",
                    "message": f"Failed to save value bets to database for {date_str}",
                    "date": date_str
                }
                
        except Exception as e:
            logger.error(f"Error saving value bets for {date_str}: {e}", exc_info=True)
            return {
                "status": "error",
                "message": f"Error saving value bets: {str(e)}",
                "date": date_str
            }


def main():
    """
    Main function for command-line usage.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="Find value betting opportunities from stored predictions and odds")
    parser.add_argument("--date", type=str, required=True, help="Date in YYYY-MM-DD format")
    parser.add_argument("--fixture", type=str, help="Specific fixture ID to analyze")
    parser.add_argument("--bookmaker", type=str, default="Bet365", help="Bookmaker name (default: Bet365)")
    parser.add_argument("--save", action="store_true", help="Save results to database")
    parser.add_argument("--top", type=int, default=10, help="Number of top bets to show (default: 10)")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    
    args = parser.parse_args()
    
    # Configure logging
    log_level = logging.DEBUG if args.debug else logging.INFO
    logging.basicConfig(level=log_level, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    # Initialize value bet finder
    finder = ValueBetFinder(bookmaker_name=args.bookmaker)
    
    if args.fixture:
        # Analyze specific fixture
        logger.info(f"Analyzing fixture {args.fixture}")
        results = finder.find_value_bets_for_fixture(args.fixture)
        
        print(f"\n=== Value Bet Analysis for Fixture {args.fixture} ===")
        print(f"Status: {results['status']}")
        
        if results['status'] == 'success':
            print(f"Match: {results['home_team']} vs {results['away_team']}")
            print(f"Value bets found: {results['total_value_bets']}")
            
            for bet in results['value_bets']:
                print(f"\n  {bet['description']}")
                print(f"  Model Probability: {bet['model_probability']:.1%}")
                print(f"  Odds: {bet['odds']}")
                print(f"  Edge: {bet['edge_percentage']:.2f}%")
        else:
            print(f"Error: {results['message']}")
    
    else:
        # Analyze date
        logger.info(f"Analyzing date {args.date}")
        
        if args.save:
            results = finder.save_value_bets_to_db(args.date)
            print(f"\n=== Save Results for {args.date} ===")
            print(f"Status: {results['status']}")
            print(f"Message: {results['message']}")
            if 'total_value_bets' in results:
                print(f"Total value bets: {results['total_value_bets']}")
        else:
            results = finder.find_value_bets_for_date(args.date)
            
            print(f"\n=== Value Bet Analysis for {args.date} ===")
            print(f"Status: {results['status']}")
            
            if results['status'] == 'success':
                print(f"Fixtures analyzed: {results['fixtures_analyzed']}")
                print(f"Total value bets: {results['total_value_bets']}")
                print(f"Average edge: {results['average_edge']:.1%}")
                
                # Show top bets
                top_bets = results['value_bets'][:args.top]
                if top_bets:
                    print(f"\n=== Top {len(top_bets)} Value Bets ===")
                    for i, bet in enumerate(top_bets, 1):
                        print(f"\n{i}. {bet['home_team']} vs {bet['away_team']}")
                        print(f"   {bet['description']}")
                        print(f"   Model Probability: {bet['model_probability']:.1%}")
                        print(f"   Odds: {bet['odds']}")
                        print(f"   Edge: {bet['edge_percentage']:.2f}%")
                else:
                    print("\nNo value bets found.")
            else:
                print(f"Error: {results['message']}")


if __name__ == "__main__":
    main() 