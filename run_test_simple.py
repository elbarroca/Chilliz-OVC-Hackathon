#!/usr/bin/env python3

import sys
import os
import json
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
from typing import Dict, Any, Optional, Tuple, List

# Add the project to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    from football_data.get_data.api_football.db_mongo import MongoDBManager
    from football_data.score_data.predict_games import (
        calculate_analytical_poisson_probs,
        run_monte_carlo_simulation,
        calculate_bivariate_poisson_probs,
        get_league_goal_covariance_lambda3
    )
    
    print("✓ Successfully imported required modules")
    
except Exception as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

class SimplePredictionTester:
    """Simplified tester focusing on core functionality."""
    
    def __init__(self):
        self.db_manager = MongoDBManager()
        print("✓ Database connection established")
    
    def calculate_team_lambdas(self, fixture_data: Dict) -> Tuple[float, float]:
        """Calculate realistic lambdas using historical team performance data from database."""
        home_team_id = fixture_data.get('home_team_id')
        away_team_id = fixture_data.get('away_team_id')
        match_date_str = fixture_data.get('date_str')
        
        if not all([home_team_id, away_team_id, match_date_str]):
            print(f"❌ Missing essential data for lambda calculation")
            return self._get_fallback_lambdas()
        
        print(f"📊 Calculating real lambdas for teams {home_team_id} vs {away_team_id}")
        
        try:
            # Parse match date for historical query
            from datetime import datetime
            match_date = datetime.strptime(match_date_str, '%Y-%m-%d')
            
            # Get historical matches for both teams (last 10 matches before this fixture)
            home_matches = self.db_manager.get_historical_matches(home_team_id, match_date, limit=10)
            away_matches = self.db_manager.get_historical_matches(away_team_id, match_date, limit=10)
            
            print(f"   Found {len(home_matches)} historical matches for home team")
            print(f"   Found {len(away_matches)} historical matches for away team")
            
            # Calculate average goals for each team
            home_goals_for, home_goals_against = self._calculate_team_averages(home_matches, home_team_id, is_home_perspective=True)
            away_goals_for, away_goals_against = self._calculate_team_averages(away_matches, away_team_id, is_home_perspective=False)
            
            if home_goals_for is None or away_goals_for is None:
                print("❌ Could not calculate team averages, using fallback")
                return self._get_fallback_lambdas()
            
            # Calculate expected goals using team strengths
            # Expected home goals = (home attack strength + away defense weakness) / 2
            # Expected away goals = (away attack strength + home defense weakness) / 2
            
            # Use league average as baseline (approximately 1.3 goals per team per match)
            league_avg = 1.3
            
            # Calculate relative strengths
            home_attack_strength = home_goals_for / league_avg if home_goals_for > 0 else 1.0
            home_defense_strength = league_avg / home_goals_against if home_goals_against > 0 else 1.0
            away_attack_strength = away_goals_for / league_avg if away_goals_for > 0 else 1.0
            away_defense_strength = league_avg / away_goals_against if away_goals_against > 0 else 1.0
            
            # Apply home advantage (typically ~0.3 goals)
            home_advantage = 0.3
            
            # Calculate expected goals
            lambda_home = (home_attack_strength * (2.0 - away_defense_strength) * league_avg) + home_advantage
            lambda_away = away_attack_strength * (2.0 - home_defense_strength) * league_avg
            
            # Ensure reasonable bounds
            lambda_home = max(0.5, min(4.0, lambda_home))
            lambda_away = max(0.5, min(4.0, lambda_away))
            
            print(f"   📈 Team Statistics:")
            print(f"      Home: {home_goals_for:.2f} goals/game, {home_goals_against:.2f} conceded/game")
            print(f"      Away: {away_goals_for:.2f} goals/game, {away_goals_against:.2f} conceded/game")
            print(f"   🎯 Calculated Expected Goals:")
            print(f"      Home team: {lambda_home:.3f}")
            print(f"      Away team: {lambda_away:.3f}")
            
            return lambda_home, lambda_away
            
        except Exception as e:
            print(f"❌ Error calculating lambdas: {e}")
            return self._get_fallback_lambdas()
    
    def _calculate_team_averages(self, matches: List[Dict], team_id: int, is_home_perspective: bool) -> Tuple[Optional[float], Optional[float]]:
        """Calculate average goals scored and conceded for a team from historical matches."""
        if not matches:
            return None, None
        
        goals_for_total = 0
        goals_against_total = 0
        valid_matches = 0
        
        for match in matches:
            try:
                # Extract team IDs and goals from fixture_details
                fixture_details = match.get('fixture_details', {})
                teams = fixture_details.get('teams', {})
                goals = fixture_details.get('goals', {})
                
                home_team_id = teams.get('home', {}).get('id')
                away_team_id = teams.get('away', {}).get('id')
                home_goals = goals.get('home')
                away_goals = goals.get('away')
                
                if not all([home_team_id, away_team_id, home_goals is not None, away_goals is not None]):
                    continue
                
                # Determine if our team was home or away in this match
                if home_team_id == team_id:
                    # Our team was home
                    goals_for = home_goals
                    goals_against = away_goals
                elif away_team_id == team_id:
                    # Our team was away
                    goals_for = away_goals
                    goals_against = home_goals
                else:
                    continue  # This match doesn't involve our team
                
                goals_for_total += goals_for
                goals_against_total += goals_against
                valid_matches += 1
                
            except Exception as e:
                continue  # Skip problematic matches
        
        if valid_matches == 0:
            return None, None
        
        avg_goals_for = goals_for_total / valid_matches
        avg_goals_against = goals_against_total / valid_matches
        
        return avg_goals_for, avg_goals_against
    
    def _get_fallback_lambdas(self) -> Tuple[float, float]:
        """Return reasonable fallback lambda values when data is not available."""
        print("   🔄 Using fallback lambda values based on typical football scoring")
        return 1.4, 1.1  # Home advantage built in
    
    def get_simple_lambdas(self, fixture_data: Dict) -> Tuple[float, float]:
        """Calculate lambdas using real team data or fallback to simple defaults."""
        home_name = fixture_data.get('home_team', 'Home Team')
        away_name = fixture_data.get('away_team', 'Away Team')
        
        print(f"📊 Calculating lambdas for {home_name} vs {away_name}")
        
        # Try to use real data calculation
        lambda_home, lambda_away = self.calculate_team_lambdas(fixture_data)
        
        print(f"   Home expected goals: {lambda_home:.3f}")
        print(f"   Away expected goals: {lambda_away:.3f}")
        
        return lambda_home, lambda_away
    
    def calculate_all_probabilities(self, lambda_home: float, lambda_away: float) -> Dict[str, Any]:
        """Calculate probabilities using all available methods."""
        results = {
            'lambdas': {
                'home': lambda_home,
                'away': lambda_away
            },
            'probabilities': {}
        }
        
        print(f"\n🎯 Calculating probabilities...")
        
        # 1. Monte Carlo Simulation
        print("   Running Monte Carlo simulation...")
        mc_probs, mc_scores = run_monte_carlo_simulation(lambda_home, lambda_away, num_simulations=10000)
        if mc_probs:
            results['probabilities']['monte_carlo'] = mc_probs
            print(f"   ✓ Monte Carlo complete ({len(mc_probs)} outcomes)")
        
        # 2. Analytical Poisson
        print("   Calculating Analytical Poisson...")
        analytical_probs = calculate_analytical_poisson_probs(lambda_home, lambda_away, max_goals=5)
        if analytical_probs:
            results['probabilities']['analytical_poisson'] = analytical_probs
            print(f"   ✓ Analytical Poisson complete ({len(analytical_probs)} outcomes)")
        
        # 3. Bivariate Poisson
        print("   Calculating Bivariate Poisson...")
        lambda3 = 0.1  # Simple covariance assumption
        if lambda3 <= min(lambda_home, lambda_away):
            bivariate_probs = calculate_bivariate_poisson_probs(lambda_home, lambda_away, lambda3, max_goals=5)
            if bivariate_probs:
                results['probabilities']['bivariate_poisson'] = bivariate_probs
                print(f"   ✓ Bivariate Poisson complete ({len(bivariate_probs)} outcomes)")
        
        return results
    
    def create_team_summary(self, fixture_data: Dict, prob_results: Dict) -> Dict[str, Any]:
        """Create a JSON summary per team with key probabilities."""
        home_team = fixture_data.get('home_team', 'Home Team')
        away_team = fixture_data.get('away_team', 'Away Team')
        fixture_id = fixture_data.get('fixture_id', 'Unknown')
        
        # Extract key probabilities from different models
        summary = {
            'fixture_info': {
                'fixture_id': fixture_id,
                'home_team': home_team,
                'away_team': away_team,
                'analysis_timestamp': datetime.now().isoformat()
            },
            'expected_goals': prob_results['lambdas'],
            'match_outcome_probabilities': {},
            'betting_markets': {}
        }
        
        # Extract 1X2 probabilities from each model
        models = ['monte_carlo', 'analytical_poisson', 'bivariate_poisson']
        
        for model in models:
            model_probs = prob_results['probabilities'].get(model, {})
            if not model_probs:
                continue
                
            # Find the right keys for this model
            if model == 'monte_carlo':
                h_key, d_key, a_key = 'prob_H', 'prob_D', 'prob_A'
                o25_key, btts_key = 'prob_O25', 'prob_BTTS_Y'
            elif model == 'analytical_poisson':
                h_key, d_key, a_key = 'poisson_prob_H', 'poisson_prob_D', 'poisson_prob_A'
                o25_key, btts_key = 'poisson_prob_O2.5', 'poisson_prob_BTTS_Yes'
            else:  # bivariate_poisson
                h_key, d_key, a_key = 'biv_poisson_prob_H', 'biv_poisson_prob_D', 'biv_poisson_prob_A'
                o25_key, btts_key = 'biv_poisson_prob_O2.5', 'biv_poisson_prob_BTTS_Yes'
            
            summary['match_outcome_probabilities'][model] = {
                'home_win': model_probs.get(h_key, 0.0),
                'draw': model_probs.get(d_key, 0.0),
                'away_win': model_probs.get(a_key, 0.0),
                'over_2_5_goals': model_probs.get(o25_key, 0.0),
                'both_teams_score': model_probs.get(btts_key, 0.0)
            }
        
        return summary
    
    def plot_probability_comparison(self, team_summary: Dict) -> None:
        """Create a visual comparison of probabilities across models."""
        print("\n📊 Creating probability comparison plot...")
        
        models = list(team_summary['match_outcome_probabilities'].keys())
        if not models:
            print("❌ No probability data available for plotting")
            return
        
        # Prepare data for plotting
        outcomes = ['home_win', 'draw', 'away_win', 'over_2_5_goals', 'both_teams_score']
        outcome_labels = ['Home Win', 'Draw', 'Away Win', 'Over 2.5 Goals', 'Both Teams Score']
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Plot 1: 1X2 Outcomes
        x = np.arange(3)
        width = 0.25
        
        for i, model in enumerate(models):
            probs = team_summary['match_outcome_probabilities'][model]
            values = [probs['home_win'], probs['draw'], probs['away_win']]
            ax1.bar(x + i*width, values, width, label=model.replace('_', ' ').title())
        
        ax1.set_xlabel('Match Outcomes')
        ax1.set_ylabel('Probability')
        ax1.set_title('1X2 Match Outcome Probabilities')
        ax1.set_xticks(x + width)
        ax1.set_xticklabels(['Home Win', 'Draw', 'Away Win'])
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Plot 2: Other Markets
        for i, model in enumerate(models):
            probs = team_summary['match_outcome_probabilities'][model]
            values = [probs['over_2_5_goals'], probs['both_teams_score']]
            x_pos = np.arange(2) + i*width
            ax2.bar(x_pos, values, width, label=model.replace('_', ' ').title())
        
        ax2.set_xlabel('Betting Markets')
        ax2.set_ylabel('Probability')
        ax2.set_title('Other Market Probabilities')
        ax2.set_xticks(np.arange(2) + width)
        ax2.set_xticklabels(['Over 2.5 Goals', 'Both Teams Score'])
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Save plot
        fixture_info = team_summary['fixture_info']
        filename = f"simple_prediction_{fixture_info['fixture_id']}.png"
        plt.savefig(filename, dpi=300, bbox_inches='tight')
        print(f"✓ Plot saved as: {filename}")
        
        # Display plot info
        plt.show()
    
    def display_json_summary(self, team_summary: Dict) -> None:
        """Display the JSON summary in a formatted way."""
        print("\n📋 TEAM PREDICTION SUMMARY (JSON)")
        print("=" * 60)
        print(json.dumps(team_summary, indent=2, default=str))
        print("=" * 60)
    
    async def test_simple_functionality(self, fixture_id: Optional[str] = None):
        """Test the simplified functionality pipeline."""
        print("🚀 Starting simplified prediction test...")
        
        try:
            # Get a fixture from the database
            if not fixture_id:
                # Get any recent fixture
                date_str = (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d')
                fixture_ids = self.db_manager.get_match_fixture_ids_for_date(date_str)
                if fixture_ids:
                    fixture_id = str(fixture_ids[0])
                else:
                    print("❌ No fixtures found, using mock data")
                    fixture_data = {
                        'fixture_id': 'mock_12345',
                        'home_team': 'Test Home FC',
                        'away_team': 'Test Away United',
                        'home_team_id': None,
                        'away_team_id': None,
                        'date_str': None
                    }
                    # Skip database lookup
                    return await self._process_fixture_data(fixture_data)
            
            print(f"📊 Processing fixture: {fixture_id}")
            
            # Get basic fixture data
            match_data = self.db_manager.get_match_data(fixture_id)
            if not match_data:
                print(f"❌ No match data found for {fixture_id}, using mock data")
                fixture_data = {
                    'fixture_id': fixture_id,
                    'home_team': 'Home Team',
                    'away_team': 'Away Team',
                    'home_team_id': None,
                    'away_team_id': None,
                    'date_str': None
                }
            else:
                # Extract comprehensive fixture info from the correct data structure
                home_team_dict = match_data.get('home_team', {})
                away_team_dict = match_data.get('away_team', {})
                
                fixture_data = {
                    'fixture_id': fixture_id,
                    'home_team': home_team_dict.get('name', 'Home Team'),
                    'away_team': away_team_dict.get('name', 'Away Team'),
                    'home_team_id': int(home_team_dict.get('id')) if home_team_dict.get('id') else None,
                    'away_team_id': int(away_team_dict.get('id')) if away_team_dict.get('id') else None,
                    'date_str': match_data.get('date_str'),
                    'league_id': int(match_data.get('league_id')) if match_data.get('league_id') else None,
                    'raw_data': match_data
                }
            
            return await self._process_fixture_data(fixture_data)
            
        except Exception as e:
            print(f"❌ Error in test: {e}")
            import traceback
            traceback.print_exc()
        finally:
            self.db_manager.close_connection()
    
    async def _process_fixture_data(self, fixture_data: Dict) -> Dict:
        """Process the fixture data through the prediction pipeline."""
        print(f"\n🏆 Fixture: {fixture_data['home_team']} vs {fixture_data['away_team']}")
        
        # 1. Calculate simple lambdas
        lambda_home, lambda_away = self.get_simple_lambdas(fixture_data)
        
        # 2. Calculate all probabilities
        prob_results = self.calculate_all_probabilities(lambda_home, lambda_away)
        
        # 3. Create team summary JSON
        team_summary = self.create_team_summary(fixture_data, prob_results)
        
        # 4. Display JSON
        self.display_json_summary(team_summary)
        
        # 5. Create plot
        self.plot_probability_comparison(team_summary)
        
        print("\n✅ Simple functionality test completed successfully!")
        return team_summary

async def main():
    """Main function to run the simplified test."""
    print("🎯 Testing simplified prediction functionality...")
    print("Focus: DB retrieval → Lambda calculation → Probability outcomes → JSON display → Plotting")
    print("-" * 80)
    
    tester = SimplePredictionTester()
    
    # Test with specific fixture ID if available, otherwise use any recent fixture
    result = await tester.test_simple_functionality()
    
    return result

if __name__ == "__main__":
    asyncio.run(main()) 