#!/usr/bin/env python3
"""
Complete Pipeline Test Script

This script demonstrates the complete flow:
1. Get daily games from the database
2. Process fixture data 
3. Run predictions for all markets using market_mapper.py
4. Generate comprehensive plots using plotting_utils.py
5. Display market analysis and value bets

Usage:
    python test_complete_pipeline.py [--date YYYY-MM-DD] [--max-fixtures N]
"""

import asyncio
import logging
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
import argparse
from typing import List, Dict, Optional

# Setup paths and imports
project_root = str(Path(__file__).resolve().parent.parent)
sys.path.insert(0, project_root)

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / '.env'
    load_dotenv(env_path)
    print("✓ Environment variables loaded")
except ImportError:
    print("⚠ python-dotenv not installed")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('complete_pipeline_test.log')
    ]
)
logger = logging.getLogger(__name__)

# Import required modules
try:
    from football_data.get_data.api_football.db_mongo import MongoDBManager
    from football_data.score_data.extract_daily_games import DailyDataPreparer  
    from football_data.score_data.predict_games import process_fixture_json
    from football_data.api.market_mapper import MARKET_MAPPING, get_market_and_selection
    from football_data.score_data.plotting_utils import create_combined_fixture_plot
    print("✓ All required modules imported successfully")
except ImportError as e:
    print(f"✗ Failed to import required modules: {e}")
    sys.exit(1)

class CompletePipelineTester:
    """Complete pipeline testing class."""
    
    def __init__(self, output_dir: str = "data/pipeline_test"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.unified_dir = self.output_dir / "unified_data"
        self.predictions_dir = self.output_dir / "predictions"
        self.plots_dir = self.output_dir / "plots"
        
        # Create subdirectories
        for directory in [self.unified_dir, self.predictions_dir, self.plots_dir]:
            directory.mkdir(parents=True, exist_ok=True)
            
        self.data_preparer = DailyDataPreparer()
        self.processed_fixtures = []
        
        # Initialize database connection
        self.db_manager = MongoDBManager()
        
        logger.info(f"Pipeline tester initialized with output directory: {self.output_dir}")

    async def get_daily_fixtures(self, target_date: datetime, max_fixtures: Optional[int] = None) -> List[str]:
        """Get fixture IDs for the specified date."""
        logger.info(f"📅 Getting fixtures for date: {target_date.strftime('%Y-%m-%d')}")
        
        try:
            # Get fixture IDs for the date
            date_str = target_date.strftime('%Y-%m-%d')
            fixture_ids = self.db_manager.get_match_fixture_ids_for_date(date_str)
            
            if not fixture_ids:
                logger.warning(f"No fixtures found for date {date_str}")
                return []
            
            # Limit fixtures if specified
            if max_fixtures and len(fixture_ids) > max_fixtures:
                fixture_ids = fixture_ids[:max_fixtures]
                logger.info(f"Limited to {max_fixtures} fixtures for testing")
            
            logger.info(f"Found {len(fixture_ids)} fixtures: {fixture_ids}")
            return fixture_ids
            
        except Exception as e:
            logger.error(f"Error getting daily fixtures: {e}", exc_info=True)
            return []

    async def extract_fixture_data(self, target_date: datetime) -> List[str]:
        """Extract unified data files for fixtures on the target date."""
        logger.info(f"📊 Extracting unified data for date: {target_date.strftime('%Y-%m-%d')}")
        
        try:
            # Use the existing data preparer with custom output directory
            original_output = self.data_preparer.OUTPUT_DIR
            self.data_preparer.OUTPUT_DIR = str(self.unified_dir)
            
            # Extract games for the date (await the async method)
            extraction_summary = await self.data_preparer.extract_games(target_date)
            
            # Restore original output directory
            self.data_preparer.OUTPUT_DIR = original_output
            
            # Find the created files
            created_files = []
            if "games_processed_summary" in extraction_summary:
                for summary in extraction_summary["games_processed_summary"]:
                    file_path = summary.get("file_path")
                    if file_path and os.path.exists(file_path):
                        created_files.append(file_path)
            
            # Also check the unified directory for any JSON files
            json_files = list(self.unified_dir.glob("*.json"))
            for json_file in json_files:
                if str(json_file) not in created_files:
                    created_files.append(str(json_file))
            
            logger.info(f"Created {len(created_files)} unified data files")
            return created_files
            
        except Exception as e:
            logger.error(f"Error extracting fixture data: {e}", exc_info=True)
            return []

    async def run_predictions_with_market_analysis(self, unified_files: List[str]) -> List[Dict]:
        """Run predictions on unified files with comprehensive market analysis."""
        logger.info(f"🎯 Running predictions with market analysis on {len(unified_files)} files")
        
        prediction_results = []
        
        for i, file_path in enumerate(unified_files, 1):
            logger.info(f"Processing file {i}/{len(unified_files)}: {os.path.basename(file_path)}")
            
            try:
                # Process the fixture JSON with enhanced analysis
                results = process_fixture_json(file_path)
                
                if results:
                    # Add file info for tracking
                    results['original_file'] = file_path
                    results['processing_timestamp'] = datetime.now().isoformat()
                    
                    prediction_results.append(results)
                    
                    # Save individual enhanced prediction file
                    base_name = os.path.splitext(os.path.basename(file_path))[0]
                    prediction_file = self.predictions_dir / f"{base_name}_enhanced_prediction.json"
                    
                    try:
                        with open(prediction_file, 'w') as f:
                            json.dump(results, f, indent=2, default=str)
                        logger.info(f"  ✓ Saved enhanced prediction to: {prediction_file}")
                    except Exception as save_error:
                        logger.error(f"  ✗ Error saving prediction file: {save_error}")
                        
                else:
                    logger.warning(f"  ✗ Failed to process file: {file_path}")
                    
            except Exception as e:
                logger.error(f"  ✗ Error processing {file_path}: {e}", exc_info=True)
        
        logger.info(f"Successfully processed {len(prediction_results)} fixtures")
        return prediction_results

    def analyze_market_coverage(self, prediction_results: List[Dict]) -> Dict:
        """Analyze market coverage across all predictions."""
        logger.info("📈 Analyzing market coverage and value opportunities")
        
        total_fixtures = len(prediction_results)
        market_stats = {
            'total_fixtures': total_fixtures,
            'models_analyzed': ['Monte Carlo', 'Analytical Poisson', 'Bivariate Poisson'],
            'market_coverage': {},
            'value_bet_summary': {
                'total_value_bets': 0,
                'high_edge_bets': 0,  # >5% edge
                'medium_edge_bets': 0,  # 2-5% edge
                'low_edge_bets': 0,  # 0-2% edge
            },
            'top_value_bets_overall': []
        }
        
        all_value_bets = []
        
        for result in prediction_results:
            fixture_id = result.get('fixture_id', 'Unknown')
            home_team = result.get('home_team', 'Home')
            away_team = result.get('away_team', 'Away')
            
            # Collect value bets
            best_bets = result.get('best_value_bets', [])
            for bet in best_bets:
                bet_info = bet.copy()
                bet_info['fixture_id'] = fixture_id
                bet_info['match'] = f"{home_team} vs {away_team}"
                all_value_bets.append(bet_info)
                
                # Categorize by edge
                edge_percent = bet.get('edge_percent', 0)
                if edge_percent > 5:
                    market_stats['value_bet_summary']['high_edge_bets'] += 1
                elif edge_percent > 2:
                    market_stats['value_bet_summary']['medium_edge_bets'] += 1
                else:
                    market_stats['value_bet_summary']['low_edge_bets'] += 1
        
        # Sort all value bets and take top 20
        all_value_bets.sort(key=lambda x: x.get('edge_percent', 0), reverse=True)
        market_stats['top_value_bets_overall'] = all_value_bets[:20]
        market_stats['value_bet_summary']['total_value_bets'] = len(all_value_bets)
        
        return market_stats

    def generate_comprehensive_plots(self, prediction_results: List[Dict]) -> None:
        """Generate comprehensive plots for all processed fixtures."""
        logger.info(f"📊 Generating comprehensive plots for {len(prediction_results)} fixtures")
        
        for i, result in enumerate(prediction_results, 1):
            fixture_id = result.get('fixture_id', 'unknown')
            home_team = result.get('home_team', 'Home')
            away_team = result.get('away_team', 'Away')
            
            logger.info(f"  Generating plot {i}/{len(prediction_results)}: {home_team} vs {away_team}")
            
            try:
                create_combined_fixture_plot(
                    fixture_results=result,
                    output_dir=str(self.plots_dir),
                    max_goals_matrix=5,
                    max_goals_pdf_axis=8
                )
                logger.info(f"    ✓ Plot generated for fixture {fixture_id}")
                
            except Exception as plot_error:
                logger.error(f"    ✗ Error generating plot for fixture {fixture_id}: {plot_error}")

    def print_summary_report(self, market_stats: Dict, prediction_results: List[Dict]) -> None:
        """Print a comprehensive summary report."""
        print("\n" + "="*80)
        print("               COMPLETE PIPELINE TEST RESULTS")
        print("="*80)
        
        print(f"\n📊 PROCESSING SUMMARY:")
        print(f"  • Total fixtures processed: {market_stats['total_fixtures']}")
        print(f"  • Models analyzed: {', '.join(market_stats['models_analyzed'])}")
        
        print(f"\n💰 VALUE BET SUMMARY:")
        vb_summary = market_stats['value_bet_summary']
        print(f"  • Total value bets found: {vb_summary['total_value_bets']}")
        print(f"  • High edge bets (>5%): {vb_summary['high_edge_bets']}")
        print(f"  • Medium edge bets (2-5%): {vb_summary['medium_edge_bets']}")
        print(f"  • Low edge bets (0-2%): {vb_summary['low_edge_bets']}")
        
        print(f"\n🏆 TOP 10 VALUE BETS OVERALL:")
        top_bets = market_stats['top_value_bets_overall'][:10]
        for i, bet in enumerate(top_bets, 1):
            edge = bet.get('edge_percent', 0)
            selection = bet.get('selection', 'Unknown')
            match = bet.get('match', 'Unknown Match')
            model = bet.get('model', 'Unknown Model')
            odds = bet.get('odds', 0)
            
            print(f"  {i:2d}. {selection:<25} | {match:<20} | {model:<12} | Edge: {edge:5.1f}% | Odds: {odds:.2f}")
        
        print(f"\n📈 FIXTURE DETAILS:")
        for result in prediction_results:
            fixture_id = result.get('fixture_id', 'unknown')
            home_team = result.get('home_team', 'Home')
            away_team = result.get('away_team', 'Away')
            
            # Get lambda values
            lambdas_orig = result.get('lambdas_original', (None, None))
            lambda_h = f"{lambdas_orig[0]:.3f}" if lambdas_orig[0] else "N/A"
            lambda_a = f"{lambdas_orig[1]:.3f}" if lambdas_orig[1] else "N/A"
            
            # Count value bets for this fixture
            fixture_bets = len(result.get('best_value_bets', []))
            
            print(f"  • {fixture_id}: {home_team} vs {away_team}")
            print(f"    Expected Goals: {lambda_h} - {lambda_a} | Value Bets: {fixture_bets}")
        
        print(f"\n📁 OUTPUT FILES:")
        print(f"  • Unified data: {self.unified_dir}")
        print(f"  • Predictions: {self.predictions_dir}")  
        print(f"  • Plots: {self.plots_dir}")
        
        print("\n" + "="*80)

    async def run_complete_test(self, target_date: datetime, max_fixtures: Optional[int] = None) -> None:
        """Run the complete pipeline test."""
        logger.info("🚀 Starting complete pipeline test")
        
        try:
            # Step 1: Get daily fixtures
            fixture_ids = await self.get_daily_fixtures(target_date, max_fixtures)
            if not fixture_ids:
                logger.error("No fixtures found to process")
                return
            
            # Step 2: Extract unified data
            unified_files = await self.extract_fixture_data(target_date)
            if not unified_files:
                logger.error("No unified data files created")
                return
            
            # Step 3: Run predictions with market analysis
            prediction_results = await self.run_predictions_with_market_analysis(unified_files)
            if not prediction_results:
                logger.error("No prediction results generated")
                return
            
            # Step 4: Analyze market coverage
            market_stats = self.analyze_market_coverage(prediction_results)
            
            # Step 5: Generate comprehensive plots
            self.generate_comprehensive_plots(prediction_results)
            
            # Step 6: Save summary report
            summary_file = self.output_dir / "pipeline_test_summary.json"
            with open(summary_file, 'w') as f:
                json.dump({
                    'test_timestamp': datetime.now().isoformat(),
                    'target_date': target_date.strftime('%Y-%m-%d'),
                    'market_stats': market_stats,
                    'fixtures_processed': len(prediction_results)
                }, f, indent=2, default=str)
            
            # Step 7: Print summary report
            self.print_summary_report(market_stats, prediction_results)
            
            logger.info("✅ Complete pipeline test finished successfully")
            
        except Exception as e:
            logger.error(f"❌ Complete pipeline test failed: {e}", exc_info=True)
        
        finally:
            # Close database connection
            try:
                self.db_manager.close_connection()
                logger.info("Database connection closed")
            except:
                pass

async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Test the complete football prediction pipeline")
    parser.add_argument('--date', type=str, help='Target date (YYYY-MM-DD), default is yesterday')
    parser.add_argument('--max-fixtures', type=int, help='Maximum number of fixtures to process')
    parser.add_argument('--output-dir', type=str, default='data/pipeline_test', help='Output directory')
    
    args = parser.parse_args()
    
    # Determine target date
    if args.date:
        try:
            target_date = datetime.strptime(args.date, '%Y-%m-%d')
        except ValueError:
            print(f"Invalid date format: {args.date}. Use YYYY-MM-DD")
            return
    else:
        # Default to yesterday (more likely to have completed fixtures)
        target_date = datetime.now() - timedelta(days=1)
    
    print(f"🎯 Testing complete pipeline for date: {target_date.strftime('%Y-%m-%d')}")
    if args.max_fixtures:
        print(f"🔢 Limited to {args.max_fixtures} fixtures")
    
    # Run the test
    tester = CompletePipelineTester(args.output_dir)
    await tester.run_complete_test(target_date, args.max_fixtures)

if __name__ == "__main__":
    asyncio.run(main()) 