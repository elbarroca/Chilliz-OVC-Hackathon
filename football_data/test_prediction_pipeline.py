#!/usr/bin/env python3
"""
Test script for the prediction pipeline to verify it works with database data.
"""

import sys
import logging
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = str(Path(__file__).resolve().parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from football_data.get_data.api_football.db_mongo import db_manager
from football_data.api.pipeline_orchestrator import process_fixture_from_db_data

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_prediction_pipeline():
    """Test the prediction pipeline with actual database data."""
    try:
        # Get a sample fixture ID from the database
        date_str = "2025-06-15"  # Use the date from the logs
        fixture_ids = db_manager.get_match_fixture_ids_for_date(date_str)
        
        if not fixture_ids:
            logger.error(f"No fixtures found for date {date_str}")
            return False
        
        # Test with the first fixture
        test_fixture_id = str(fixture_ids[0])
        logger.info(f"Testing prediction pipeline with fixture ID: {test_fixture_id}")
        
        # Get match processor data
        match_processor_data = db_manager.get_match_processor_data(test_fixture_id)
        
        if not match_processor_data:
            logger.error(f"No match processor data found for fixture {test_fixture_id}")
            return False
        
        logger.info(f"Found match processor data with keys: {list(match_processor_data.keys())}")
        
        # Process the fixture
        prediction_results = process_fixture_from_db_data(match_processor_data)
        
        if prediction_results:
            logger.info("✅ Prediction pipeline test PASSED")
            logger.info(f"Generated predictions for: {prediction_results['home_team']} vs {prediction_results['away_team']}")
            
            # Log what predictions were generated
            prediction_types = []
            if prediction_results.get('mc_probs'):
                prediction_types.append("Monte Carlo")
            if prediction_results.get('analytical_poisson_probs'):
                prediction_types.append("Analytical Poisson")
            if prediction_results.get('bivariate_poisson_probs'):
                prediction_types.append("Bivariate Poisson")
            if prediction_results.get('elo_probs'):
                prediction_types.append("Elo")
            if prediction_results.get('gb_probs'):
                prediction_types.append("Gradient Boosting")
            
            logger.info(f"Generated prediction types: {', '.join(prediction_types)}")
            
            # Show some sample probabilities
            if prediction_results.get('mc_probs'):
                mc_probs = prediction_results['mc_probs']
                logger.info(f"Sample MC probabilities:")
                logger.info(f"  Home Win: {mc_probs.get('prob_H', 'N/A'):.3f}")
                logger.info(f"  Draw: {mc_probs.get('prob_D', 'N/A'):.3f}")
                logger.info(f"  Away Win: {mc_probs.get('prob_A', 'N/A'):.3f}")
                logger.info(f"  Over 2.5: {mc_probs.get('prob_O25', 'N/A'):.3f}")
                logger.info(f"  BTTS Yes: {mc_probs.get('prob_BTTS_Y', 'N/A'):.3f}")
            
            return True
        else:
            logger.error("❌ Prediction pipeline test FAILED - No results generated")
            return False
            
    except Exception as e:
        logger.error(f"❌ Prediction pipeline test FAILED with exception: {e}", exc_info=True)
        return False

if __name__ == "__main__":
    logger.info("Starting prediction pipeline test...")
    success = test_prediction_pipeline()
    
    if success:
        logger.info("🎉 Test completed successfully!")
        sys.exit(0)
    else:
        logger.error("💥 Test failed!")
        sys.exit(1) 