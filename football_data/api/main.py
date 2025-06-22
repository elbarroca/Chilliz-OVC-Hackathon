import sys
from pathlib import Path as PathLib
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException, Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# Add project root to system path
project_root = str(PathLib(__file__).resolve().parent.parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Local imports
from football_data.api.pipeline_orchestrator import run_full_pipeline
from football_data.api.analysis_generator import FixtureAnalysisGenerator
from football_data.get_data.api_football.db_mongo import db_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AlphaSteam Football Data & Prediction API",
    description="Simple API with 2 endpoints: collect data and analyze predictions by date.",
    version="2.0.0"
)

@app.on_event("startup")
async def startup_event():
    """Ensures the database manager is initialized when the app starts."""
    logger.info("Application startup: ensuring DB manager is initialized.")
    # The global db_manager is initialized on import, but this is a good safeguard.
    if not db_manager.is_initialized():
        logger.warning("DB Manager was not initialized on startup, re-initializing.")
        db_manager.__init__()

@app.on_event("shutdown")
def shutdown_event():
    """Closes the database connection when the app shuts down."""
    logger.info("Application shutdown: closing DB connection.")
    db_manager.close_connection()

# --- Pydantic Models for API Schema ---

class FixtureInfo(BaseModel):
    fixture_id: str
    home_team: str
    away_team: str
    home_team_logo: Optional[str] = None
    away_team_logo: Optional[str] = None
    league_name: Optional[str] = None
    date: Optional[str] = None
    analysis_timestamp: str

class ExpectedGoals(BaseModel):
    home: float
    away: float

class OutcomeProbabilities(BaseModel):
    home_win: float
    draw: float
    away_win: float
    over_2_5_goals: float
    both_teams_score: float

class PlotSeries(BaseModel):
    name: str
    data: List[float]

class PlotData(BaseModel):
    categories: List[str]
    series: List[PlotSeries]

class ExpectedGoalsComparison(BaseModel):
    home_team: str
    away_team: str
    home_expected: float
    away_expected: float

class ComprehensivePlottingData(BaseModel):
    match_outcome_chart: PlotData
    goals_markets_chart: PlotData
    btts_chart: PlotData
    double_chance_chart: PlotData
    expected_goals_comparison: ExpectedGoalsComparison

class MatchAnalysis(BaseModel):
    fixture_info: FixtureInfo
    expected_goals: ExpectedGoals
    match_outcome_probabilities: Dict[str, OutcomeProbabilities]
    all_market_probabilities: Dict[str, Dict[str, Dict[str, float]]]  # model -> market -> selection -> probability
    plotting_data: ComprehensivePlottingData
    reasoning: str

class DateAnalysisResponse(BaseModel):
    date: str
    total_matches: int
    matches: List[MatchAnalysis]
    summary_stats: Dict[str, Any] = Field(default_factory=dict)

# --- API Endpoints ---

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint for API health check."""
    return {
        "message": "AlphaSteam Football Data & Prediction API",
        "status": "healthy",
        "version": "2.0.0",
        "endpoints": {
            "collect_data": "POST /data/{date} - Collect and save games data for a specific date",
            "analyze_predictions": "GET /predictions/{date} - Get predictions for all games on a specific date",
            "get_fixture_analysis": "GET /predictions/fixture/{fixture_id} - Get prediction analysis for a specific fixture"
        }
    }

@app.post("/data/{date}", tags=["Data Collection"])
async def collect_games_data(
    date: str = Path(..., description="Target date in YYYY-MM-DD format to collect games data.")
):
    """
    Endpoint 1: Collect games data for a specific date and save to MongoDB.
    
    This endpoint will:
    1. Scrape all games for the specified date
    2. Fetch detailed fixture information
    3. Get odds data
    4. Save everything to MongoDB
    
    Input: Date string (YYYY-MM-DD)
    Output: Summary of collected data
    """
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    
    try:
        logger.info(f"Starting data collection for {date}")
        result = await run_full_pipeline(target_date)
        
        # Get count of collected matches using the global db_manager
        fixture_ids = db_manager.get_match_fixture_ids_for_date(date)
        
        return {
            "status": "success",
            "date": date,
            "message": f"Data collection completed for {date}",
            "matches_collected": len(fixture_ids) if fixture_ids else 0,
            "details": result
        }
        
    except Exception as e:
        logger.error(f"Error collecting data for {date}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Data collection failed: {str(e)}")

@app.get("/predictions/{date}", tags=["Predictions Analysis"], response_model=DateAnalysisResponse)
async def analyze_predictions_for_date(
    date: str = Path(..., description="Target date in YYYY-MM-DD format to analyze predictions.")
):
    """
    Endpoint 2: Get all games from MongoDB for a date, run predictions, and return full JSON.
    
    This endpoint will:
    1. Retrieve all games for the specified date from MongoDB
    2. Run prediction analysis for each game
    3. Return comprehensive JSON with all probabilities and chart data
    4. Save the complete analysis to the 'predictions' collection
    
    Input: Date string (YYYY-MM-DD)
    Output: Complete analysis with predictions for all games
    """
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")
    
    try:
        logger.info(f"Starting predictions analysis for {date}")
        
        # Get all fixture IDs for the date
        fixture_ids = db_manager.get_match_fixture_ids_for_date(date)

        if not fixture_ids:
            logger.warning(f"No daily_games for {date}, checking match_processor for cached fixtures.")
            fixture_ids = db_manager.get_processed_fixture_ids_for_date(date)
        
        if not fixture_ids:
            raise HTTPException(
                status_code=404, 
                detail=f"No games found for {date}. Please collect data first using POST /data/{date}"
            )
        
        # Generate analysis for each fixture
        matches_analysis = []
        generator = FixtureAnalysisGenerator()
        
        for fixture_id in fixture_ids:
            try:
                analysis = await generator.generate_fixture_analysis(str(fixture_id))
                if analysis:
                    matches_analysis.append(analysis)
                else:
                    logger.warning(f"Could not generate analysis for fixture {fixture_id}")
            except Exception as e:
                logger.error(f"Error analyzing fixture {fixture_id}: {e}")
                continue
        
        # Calculate summary stats
        summary_stats = {
            "total_fixtures_found": len(fixture_ids),
            "successful_analyses": len(matches_analysis),
            "failed_analyses": len(fixture_ids) - len(matches_analysis),
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        # Construct the full response payload
        response_payload = {
            "date": date,
            "total_matches": len(matches_analysis),
            "matches": matches_analysis,
            "summary_stats": summary_stats
        }

        if matches_analysis:
            # Add some aggregate stats
            home_wins = sum(1 for match in matches_analysis for model in match.get('match_outcome_probabilities', {}).values() if model.get('home_win', 0) > 0.5)
            draws = sum(1 for match in matches_analysis for model in match.get('match_outcome_probabilities', {}).values() if model.get('draw', 0) > 0.5)
            away_wins = sum(1 for match in matches_analysis for model in match.get('match_outcome_probabilities', {}).values() if model.get('away_win', 0) > 0.5)
            
            summary_stats.update({
                "predicted_outcomes": {
                    "home_wins_predicted": home_wins,
                    "draws_predicted": draws,
                    "away_wins_predicted": away_wins
                }
            })
            
            # Save individual match analyses to match_analysis collection (for fixture ID queries)
            for match in matches_analysis:
                fixture_id = match.get('fixture_info', {}).get('fixture_id')
                if fixture_id:
                    individual_save_success = db_manager.save_individual_match_analysis(match)
                    if individual_save_success:
                        logger.debug(f"Successfully saved individual analysis for fixture {fixture_id}")
                    else:
                        logger.warning(f"Failed to save individual analysis for fixture {fixture_id}")
            
            # Save the entire payload to the predictions collection (for date queries)
            save_success = db_manager.save_predictions_analysis(response_payload)
            if save_success:
                logger.info(f"Successfully saved prediction analysis for {date} to the database.")
            else:
                logger.warning(f"Failed to save prediction analysis for {date} to the database.")
        
        return response_payload
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing predictions for {date}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Predictions analysis failed: {str(e)}")

@app.get("/predictions/fixture/{fixture_id}", tags=["Predictions Analysis"], response_model=MatchAnalysis)
async def get_fixture_analysis(
    fixture_id: str = Path(..., description="Fixture ID to get analysis for.")
):
    """
    Endpoint 3: Get prediction analysis for a specific fixture ID.
    
    This endpoint will:
    1. Retrieve the analysis for the specific fixture ID from MongoDB
    2. Return comprehensive JSON with all probabilities and chart data
    
    Input: Fixture ID (string)
    Output: Complete analysis with predictions for the specific fixture
    """
    try:
        logger.info(f"Getting prediction analysis for fixture {fixture_id}")
        
        # Get analysis from the match_analysis collection
        analysis = db_manager.get_individual_match_analysis(fixture_id)
        
        if not analysis:
            # If not found in match_analysis, try generating it fresh
            generator = FixtureAnalysisGenerator()
            analysis = await generator.generate_fixture_analysis(fixture_id)
            
            if analysis:
                # Save the newly generated analysis
                save_success = db_manager.save_individual_match_analysis(analysis)
                if save_success:
                    logger.info(f"Generated and saved new analysis for fixture {fixture_id}")
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"Fixture analysis not found for ID {fixture_id} and could not generate new analysis"
                )
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analysis for fixture {fixture_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get fixture analysis: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server for AlphaSteam API V2.")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 