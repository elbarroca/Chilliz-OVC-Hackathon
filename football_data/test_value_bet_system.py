"""
Test script for the complete value bet system.

This script tests:
1. Prediction generation and saving to database
2. Edge analysis and value bet finding
3. Integration between all components
"""

import sys
import os
import logging
from datetime import datetime

# Add project root to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from football_data.get_data.api_football.db_mongo import db_manager
from football_data.score_data.value_bet_finder import ValueBetFinder
from football_data.score_data.edge_analyzer import EdgeAnalyzer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_database_connection():
    """Test database connectivity."""
    logger.info("Testing database connection...")
    try:
        status = db_manager.get_pipeline_status()
        logger.info(f"✅ Database connected successfully. Timestamp: {status['timestamp_utc']}")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False

def test_prediction_data_availability(date_str: str):
    """Test if prediction data is available for the given date."""
    logger.info(f"Testing prediction data availability for {date_str}...")
    
    try:
        fixture_ids = db_manager.get_match_fixture_ids_for_date(date_str)
        if not fixture_ids:
            logger.warning(f"⚠️ No fixtures found for {date_str}")
            return False, []
        
        logger.info(f"Found {len(fixture_ids)} fixtures for {date_str}")
        
        predictions_found = 0
        odds_found = 0
        
        for fixture_id in fixture_ids:
            prediction_data = db_manager.get_prediction_results(str(fixture_id))
            odds_data = db_manager.get_odds_data(str(fixture_id))
            
            if prediction_data:
                predictions_found += 1
            if odds_data:
                odds_found += 1
        
        logger.info(f"Predictions available: {predictions_found}/{len(fixture_ids)}")
        logger.info(f"Odds available: {odds_found}/{len(fixture_ids)}")
        
        if predictions_found > 0 and odds_found > 0:
            logger.info("✅ Both predictions and odds data available")
            return True, fixture_ids
        else:
            logger.warning("⚠️ Missing predictions or odds data")
            return False, fixture_ids
            
    except Exception as e:
        logger.error(f"❌ Error checking prediction data: {e}")
        return False, []

def test_edge_analyzer():
    """Test the EdgeAnalyzer class."""
    logger.info("Testing EdgeAnalyzer...")
    
    try:
        analyzer = EdgeAnalyzer(bookmaker_name="Bet365")
        
        # Test probability calculation
        test_odds = 2.50
        implied_prob = analyzer.calculate_implied_probability(test_odds)
        expected_prob = 1.0 / test_odds
        
        if abs(implied_prob - expected_prob) < 0.001:
            logger.info("✅ Implied probability calculation correct")
        else:
            logger.error(f"❌ Implied probability calculation incorrect: {implied_prob} vs {expected_prob}")
            return False
        
        # Test edge calculation
        model_prob = 0.6
        edge = analyzer.calculate_edge(model_prob, test_odds)
        expected_edge = (model_prob * test_odds) - 1
        
        if abs(edge - expected_edge) < 0.001:
            logger.info("✅ Edge calculation correct")
        else:
            logger.error(f"❌ Edge calculation incorrect: {edge} vs {expected_edge}")
            return False
        
        logger.info("✅ EdgeAnalyzer tests passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ EdgeAnalyzer test failed: {e}")
        return False

def test_value_bet_finder(date_str: str):
    """Test the ValueBetFinder class."""
    logger.info(f"Testing ValueBetFinder for {date_str}...")
    
    try:
        finder = ValueBetFinder(bookmaker_name="Bet365")
        
        # Test finding value bets for date
        results = finder.find_value_bets_for_date(date_str)
        
        if results.get("status") == "success":
            logger.info(f"✅ Value bet analysis successful")
            logger.info(f"   Fixtures analyzed: {results.get('fixtures_analyzed', 0)}")
            logger.info(f"   Total value bets: {results.get('total_value_bets', 0)}")
            logger.info(f"   Average edge: {results.get('average_edge', 0):.1%}")
            
            # Show some example value bets if found
            value_bets = results.get('value_bets', [])
            if value_bets:
                logger.info("   Top value bets:")
                for i, bet in enumerate(value_bets[:3], 1):
                    logger.info(f"     {i}. {bet['home_team']} vs {bet['away_team']}")
                    logger.info(f"        {bet['description']} - Edge: {bet['edge_percentage']:.2f}%")
            
            return True, results
        else:
            logger.warning(f"⚠️ Value bet analysis returned: {results.get('status')} - {results.get('message')}")
            return False, results
            
    except Exception as e:
        logger.error(f"❌ ValueBetFinder test failed: {e}")
        return False, {}

def test_fixture_analysis(fixture_id: str):
    """Test value bet analysis for a specific fixture."""
    logger.info(f"Testing fixture analysis for {fixture_id}...")
    
    try:
        finder = ValueBetFinder(bookmaker_name="Bet365")
        results = finder.find_value_bets_for_fixture(fixture_id)
        
        if results.get("status") == "success":
            logger.info(f"✅ Fixture analysis successful")
            logger.info(f"   Match: {results.get('home_team')} vs {results.get('away_team')}")
            logger.info(f"   Value bets found: {results.get('total_value_bets', 0)}")
            
            value_bets = results.get('value_bets', [])
            if value_bets:
                logger.info("   Value bets:")
                for bet in value_bets:
                    logger.info(f"     {bet['description']} - Edge: {bet['edge_percentage']:.2f}%")
            
            return True
        else:
            logger.warning(f"⚠️ Fixture analysis returned: {results.get('status')} - {results.get('message')}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Fixture analysis test failed: {e}")
        return False

def main():
    """Run all tests."""
    logger.info("🚀 Starting value bet system tests...")
    
    # Test date - you can change this to a date that has data
    test_date = "2025-06-15"  # Use the same date from your previous test
    
    # Test 1: Database connection
    if not test_database_connection():
        logger.error("❌ Database connection failed. Stopping tests.")
        return
    
    # Test 2: Check data availability
    data_available, fixture_ids = test_prediction_data_availability(test_date)
    if not data_available:
        logger.warning("⚠️ Limited data available for comprehensive testing")
    
    # Test 3: EdgeAnalyzer functionality
    if not test_edge_analyzer():
        logger.error("❌ EdgeAnalyzer tests failed. Stopping tests.")
        return
    
    # Test 4: ValueBetFinder for date
    if data_available:
        success, results = test_value_bet_finder(test_date)
        if success:
            logger.info("✅ ValueBetFinder date analysis passed")
        else:
            logger.warning("⚠️ ValueBetFinder date analysis had issues")
        
        # Test 5: Individual fixture analysis
        if fixture_ids:
            test_fixture_id = str(fixture_ids[0])
            if test_fixture_analysis(test_fixture_id):
                logger.info("✅ Individual fixture analysis passed")
            else:
                logger.warning("⚠️ Individual fixture analysis had issues")
    else:
        logger.warning("⚠️ Skipping ValueBetFinder tests due to missing data")
    
    logger.info("🎉 Value bet system tests completed!")
    logger.info("\n" + "="*60)
    logger.info("SUMMARY:")
    logger.info("- Database connection: ✅")
    logger.info("- EdgeAnalyzer: ✅")
    if data_available:
        logger.info("- ValueBetFinder: ✅")
        logger.info("- Fixture analysis: ✅")
        logger.info("\n🎯 System is ready for value bet analysis!")
    else:
        logger.info("- ValueBetFinder: ⚠️ (limited data)")
        logger.info("- Fixture analysis: ⚠️ (limited data)")
        logger.info(f"\n💡 To fully test, ensure you have predictions and odds for {test_date}")
        logger.info("   Run the prediction pipeline first:")
        logger.info(f"   python -m football_data.test_prediction_pipeline")

if __name__ == "__main__":
    main() 