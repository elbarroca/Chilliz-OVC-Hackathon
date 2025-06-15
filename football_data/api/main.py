import sys
from fastapi import FastAPI, HTTPException, Path
from datetime import datetime
import logging
from pathlib import Path as PathLib

from football_data.api.pipeline_orchestrator import run_data_fetching, run_prediction_generation, run_edge_analysis

# Add project root to system path to allow for sibling imports
project_root = str(PathLib(__file__).resolve().parent.parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AlphaSteam Football Data & Prediction API",
    description="An API to orchestrate data fetching, prediction generation, and betting analysis.",
    version="1.0.0"
)

# --- Refactored Pipeline Logic (to be implemented) ---
# In a real application, the logic from run_pipeline.py would be refactored
# into importable functions. For now, we'll have placeholders.

async def trigger_data_fetching(date: datetime):
    """Placeholder for the data fetching part of the pipeline."""
    logger.info(f"Triggering data fetching for {date.strftime('%Y-%m-%d')}")
    result = await run_data_fetching(date)
    return result

async def trigger_prediction_generation(date: datetime):
    """Placeholder for the prediction generation part of the pipeline."""
    logger.info(f"Triggering prediction generation for {date.strftime('%Y-%m-%d')}")
    result = await run_prediction_generation(date)
    return result

async def trigger_edge_analysis(date: datetime):
    """Placeholder for the edge/value analysis."""
    logger.info(f"Triggering edge analysis for {date.strftime('%Y-%m-%d')}")
    result = await run_edge_analysis(date)
    return result


# --- API Endpoints ---

@app.get("/", tags=["Health"])
async def root():
    """
    Root endpoint - API health check and basic information.
    """
    return {
        "message": "AlphaSteam Football Data & Prediction API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint to verify API and database connectivity.
    """
    try:
        from football_data.get_data.api_football.db_mongo import db_manager
        # Simple DB connectivity check
        status = db_manager.get_pipeline_status()
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": status["timestamp_utc"]
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@app.post("/data/{date}", tags=["Data Pipeline"])
async def get_data(
    date: str = Path(..., description="Target date in YYYY-MM-DD format.")
):
    """
    Triggers the data pipeline to scrape games, enrich fixture details,
    and fetch odds for a given date.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    
    result = await trigger_data_fetching(target_date)
    return result

@app.post("/predictions/{date}", tags=["Data Pipeline"])
async def craft_predictions(
    date: str = Path(..., description="Target date in YYYY-MM-DD format.")
):
    """
    Triggers the prediction pipeline for a given date. This should be run
    after the data for that date has been successfully fetched.
    Results are automatically saved to the predictions collection.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
        
    result = await trigger_prediction_generation(target_date)
    return result

@app.post("/predictions/save/{date}", tags=["Data Pipeline"])
async def save_predictions_to_db(
    date: str = Path(..., description="Target date in YYYY-MM-DD format.")
):
    """
    Generates predictions for a given date and saves them to the predictions collection.
    This endpoint specifically focuses on saving prediction results to MongoDB.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    
    from football_data.api.pipeline_orchestrator import run_prediction_generation_and_save
    
    result = await run_prediction_generation_and_save(target_date)
    return result

@app.get("/analysis/edge/{date}", tags=["Analysis"])
async def analyze_edge(
    date: str = Path(..., description="Target date in YYYY-MM-DD format.")
):
    """
    Analyzes the relationship between stored predictions and odds to find
    value bets (edge). Returns a list of betting opportunities.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
        
    result = await trigger_edge_analysis(target_date)
    return result

@app.get("/predictions/{fixture_id}", tags=["Analysis"])
async def get_prediction_results(
    fixture_id: str = Path(..., description="Fixture ID to get predictions for.")
):
    """
    Retrieves stored prediction results for a specific fixture ID.
    """
    try:
        from football_data.get_data.api_football.db_mongo import db_manager
        
        prediction_data = db_manager.get_prediction_results(fixture_id)
        if not prediction_data:
            raise HTTPException(status_code=404, detail=f"No prediction results found for fixture {fixture_id}")
        
        return {
            "status": "success",
            "fixture_id": fixture_id,
            "predictions": prediction_data
        }
    except Exception as e:
        logger.error(f"Error retrieving predictions for fixture {fixture_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving predictions: {str(e)}")

@app.get("/value-bets/{date}", tags=["Analysis"])
async def find_value_bets(
    date: str = Path(..., description="Target date in YYYY-MM-DD format.")
):
    """
    Finds value betting opportunities for a given date by analyzing
    stored predictions against bookmaker odds.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    
    try:
        from football_data.score_data.value_bet_finder import ValueBetFinder
        
        finder = ValueBetFinder(bookmaker_name="Bet365")
        results = finder.find_value_bets_for_date(date)
        
        return results
        
    except Exception as e:
        logger.error(f"Error finding value bets for {date}: {e}")
        raise HTTPException(status_code=500, detail=f"Error finding value bets: {str(e)}")

@app.post("/value-bets/save/{date}", tags=["Analysis"])
async def save_value_bets(
    date: str = Path(..., description="Target date in YYYY-MM-DD format.")
):
    """
    Finds value betting opportunities for a given date and saves them
    to the betting papers collection in the database.
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    
    try:
        from football_data.score_data.value_bet_finder import ValueBetFinder
        
        finder = ValueBetFinder(bookmaker_name="Bet365")
        results = finder.save_value_bets_to_db(date)
        
        return results
        
    except Exception as e:
        logger.error(f"Error saving value bets for {date}: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving value bets: {str(e)}")

@app.get("/value-bets/fixture/{fixture_id}", tags=["Analysis"])
async def find_value_bets_for_fixture(
    fixture_id: str = Path(..., description="Fixture ID to analyze for value bets.")
):
    """
    Finds value betting opportunities for a specific fixture.
    """
    try:
        from football_data.score_data.value_bet_finder import ValueBetFinder
        
        finder = ValueBetFinder(bookmaker_name="Bet365")
        results = finder.find_value_bets_for_fixture(fixture_id)
        
        return results
        
    except Exception as e:
        logger.error(f"Error finding value bets for fixture {fixture_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error finding value bets: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # To run this API:
    # uvicorn football_data.api.main:app --reload
    logger.info("Starting Uvicorn server for AlphaSteam API.")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 