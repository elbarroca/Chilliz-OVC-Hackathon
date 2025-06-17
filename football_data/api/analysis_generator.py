#!/usr/bin/env python3

import sys
import os
import json
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

# Add the project to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

try:
    from football_data.get_data.api_football.db_mongo import MongoDBManager
    from football_data.score_data.predict_games import (
        calculate_analytical_poisson_probs,
        run_monte_carlo_simulation,
        calculate_bivariate_poisson_probs,
        get_league_goal_covariance_lambda3
    )
    from football_data.api.market_mapper import MARKET_MAPPING
    
    # print("✓ Successfully imported required modules for FixtureAnalysisGenerator")
    
except Exception as e:
    print(f"❌ Import error in FixtureAnalysisGenerator: {e}")
    sys.exit(1)

class FixtureAnalysisGenerator:
    """
    Generates a comprehensive analysis for a single fixture, including
    probabilities and data formatted for UI plotting.
    """
    
    def __init__(self):
        # Don't initialize DB connection here, create fresh connections as needed
        pass
    
    def calculate_team_lambdas(self, fixture_data: Dict) -> Tuple[float, float]:
        """Calculate realistic lambdas using historical team performance data from database."""
        home_team_id = fixture_data.get('home_team_id')
        away_team_id = fixture_data.get('away_team_id')
        match_date_str = fixture_data.get('date_str')
        
        if not all([home_team_id, away_team_id, match_date_str]):
            return self._get_fallback_lambdas()
        
        try:
            # Create fresh DB connection
            db_manager = MongoDBManager()
            
            from datetime import datetime
            match_date = datetime.strptime(match_date_str, '%Y-%m-%d')
            
            home_matches = db_manager.get_historical_matches(home_team_id, match_date, limit=10)
            away_matches = db_manager.get_historical_matches(away_team_id, match_date, limit=10)
            
            # The connection is now managed by the calling endpoint, so we don't close it here.
            # db_manager.close_connection()
            
            home_goals_for, home_goals_against = self._calculate_team_averages(home_matches, home_team_id)
            away_goals_for, away_goals_against = self._calculate_team_averages(away_matches, away_team_id)
            
            if home_goals_for is None or away_goals_for is None:
                return self._get_fallback_lambdas()
            
            league_avg = 1.3
            home_attack_strength = home_goals_for / league_avg if home_goals_for > 0 else 1.0
            home_defense_strength = league_avg / home_goals_against if home_goals_against > 0 else 1.0
            away_attack_strength = away_goals_for / league_avg if away_goals_for > 0 else 1.0
            away_defense_strength = league_avg / away_goals_against if away_goals_against > 0 else 1.0
            
            home_advantage = 0.3
            lambda_home = (home_attack_strength * (2.0 - away_defense_strength) * league_avg) + home_advantage
            lambda_away = away_attack_strength * (2.0 - home_defense_strength) * league_avg
            
            lambda_home = max(0.5, min(4.0, lambda_home))
            lambda_away = max(0.5, min(4.0, lambda_away))
            
            return lambda_home, lambda_away
            
        except Exception as e:
            return self._get_fallback_lambdas()
    
    def _calculate_team_averages(self, matches: List[Dict], team_id: int) -> Tuple[Optional[float], Optional[float]]:
        if not matches:
            return None, None
        
        goals_for_total, goals_against_total, valid_matches = 0, 0, 0
        
        for match in matches:
            fixture_details = match.get('fixture_details', {})
            teams = fixture_details.get('teams', {})
            goals = fixture_details.get('goals', {})
            
            home_team_id = teams.get('home', {}).get('id')
            away_team_id = teams.get('away', {}).get('id')
            home_goals = goals.get('home')
            away_goals = goals.get('away')
            
            if not all([home_team_id, away_team_id, home_goals is not None, away_goals is not None]):
                continue
            
            if home_team_id == team_id:
                goals_for, goals_against = home_goals, away_goals
            elif away_team_id == team_id:
                goals_for, goals_against = away_goals, home_goals
            else:
                continue
            
            goals_for_total += goals_for
            goals_against_total += goals_against
            valid_matches += 1
        
        if valid_matches == 0:
            return None, None
        
        return goals_for_total / valid_matches, goals_against_total / valid_matches
    
    def _get_fallback_lambdas(self) -> Tuple[float, float]:
        return 1.4, 1.1
    
    def get_simple_lambdas(self, fixture_data: Dict) -> Tuple[float, float]:
        return self.calculate_team_lambdas(fixture_data)
    
    def calculate_all_probabilities(self, lambda_home: float, lambda_away: float) -> Dict[str, Any]:
        results = {'lambdas': {'home': lambda_home, 'away': lambda_away}, 'probabilities': {}}
        
        mc_probs, _ = run_monte_carlo_simulation(lambda_home, lambda_away, num_simulations=10000)
        if mc_probs: results['probabilities']['monte_carlo'] = mc_probs
        
        analytical_probs = calculate_analytical_poisson_probs(lambda_home, lambda_away, max_goals=5)
        if analytical_probs: results['probabilities']['analytical_poisson'] = analytical_probs
        
        lambda3 = 0.1
        if lambda3 <= min(lambda_home, lambda_away):
            bivariate_probs = calculate_bivariate_poisson_probs(lambda_home, lambda_away, lambda3, max_goals=5)
            if bivariate_probs: results['probabilities']['bivariate_poisson'] = bivariate_probs
        
        return results
    
    def extract_all_market_probabilities(self, prob_results: Dict) -> Dict[str, Dict[str, float]]:
        """Extract all probabilities mapped to betting markets from market_mapper.py"""
        all_markets = {}
        
        for model_name, model_probs in prob_results['probabilities'].items():
            all_markets[model_name] = {}
            
            # Create a normalized mapping for different model key formats
            normalized_probs = {}
            
            if model_name == 'monte_carlo':
                # Monte Carlo uses prob_X format
                normalized_probs = model_probs
            elif model_name == 'analytical_poisson':
                # Analytical Poisson uses poisson_prob_X format - normalize to prob_X
                for key, value in model_probs.items():
                    if key.startswith('poisson_prob_'):
                        normalized_key = key.replace('poisson_prob_', 'prob_')
                        # Handle special cases for goal lines
                        if normalized_key == 'prob_O2.5':
                            normalized_key = 'prob_O25'
                        elif normalized_key == 'prob_U2.5':
                            normalized_key = 'prob_U25'
                        elif normalized_key == 'prob_BTTS_Yes':
                            normalized_key = 'prob_BTTS_Y'
                        elif normalized_key == 'prob_BTTS_No':
                            normalized_key = 'prob_BTTS_N'
                        normalized_probs[normalized_key] = value
            elif model_name == 'bivariate_poisson':
                # Bivariate Poisson uses biv_poisson_prob_X format - normalize to prob_X
                for key, value in model_probs.items():
                    if key.startswith('biv_poisson_prob_'):
                        normalized_key = key.replace('biv_poisson_prob_', 'prob_')
                        # Handle special cases for goal lines
                        if normalized_key == 'prob_O2.5':
                            normalized_key = 'prob_O25'
                        elif normalized_key == 'prob_U2.5':
                            normalized_key = 'prob_U25'
                        elif normalized_key == 'prob_BTTS_Yes':
                            normalized_key = 'prob_BTTS_Y'
                        elif normalized_key == 'prob_BTTS_No':
                            normalized_key = 'prob_BTTS_N'
                        normalized_probs[normalized_key] = value
            
            # Now go through normalized probabilities and map to markets
            for prob_key, prob_value in normalized_probs.items():
                # Check if this probability key exists in our market mapping
                if prob_key in MARKET_MAPPING:
                    market_info = MARKET_MAPPING[prob_key]
                    market_name = market_info['market_name']
                    selection_value = market_info['selection_value']
                    
                    # Create nested structure: model -> market -> selection -> probability
                    if market_name not in all_markets[model_name]:
                        all_markets[model_name][market_name] = {}
                    
                    all_markets[model_name][market_name][selection_value] = prob_value
        
        return all_markets

    def generate_comprehensive_plotting_data(self, team_summary: Dict) -> Dict:
        """Generate comprehensive plotting data for all markets and metrics - ONLY Monte Carlo."""
        plotting_data = {
            'match_outcome_chart': {
                'categories': ['Home Win', 'Draw', 'Away Win'],
                'series': []
            },
            'goals_markets_chart': {
                'categories': ['Over 1.5', 'Over 2.5', 'Over 3.5', 'Under 1.5', 'Under 2.5', 'Under 3.5'],
                'series': []
            },
            'btts_chart': {
                'categories': ['Both Teams Score Yes', 'Both Teams Score No'],
                'series': []
            },
            'double_chance_chart': {
                'categories': ['Home/Draw', 'Draw/Away', 'Home/Away'],
                'series': []
            },
            'expected_goals_comparison': {
                'home_team': team_summary['fixture_info']['home_team'],
                'away_team': team_summary['fixture_info']['away_team'],
                'home_expected': team_summary['expected_goals']['home'],
                'away_expected': team_summary['expected_goals']['away']
            }
        }
        
        # Only include Monte Carlo data in plotting
        if 'monte_carlo' in team_summary.get('all_market_probabilities', {}):
            model_data = team_summary['all_market_probabilities']['monte_carlo']
            model_name = "Monte Carlo"
            
            # 1X2 outcomes
            match_winner = model_data.get('Match Winner', {})
            plotting_data['match_outcome_chart']['series'].append({
                'name': model_name,
                'data': [
                    match_winner.get('Home', 0.0),
                    match_winner.get('Draw', 0.0),
                    match_winner.get('Away', 0.0)
                ]
            })
            
            # Goals markets
            goals_over_under = model_data.get('Goals Over/Under', {})
            plotting_data['goals_markets_chart']['series'].append({
                'name': model_name,
                'data': [
                    goals_over_under.get('Over 1.5', 0.0),
                    goals_over_under.get('Over 2.5', 0.0),
                    goals_over_under.get('Over 3.5', 0.0),
                    goals_over_under.get('Under 1.5', 0.0),
                    goals_over_under.get('Under 2.5', 0.0),
                    goals_over_under.get('Under 3.5', 0.0)
                ]
            })
            
            # BTTS
            btts = model_data.get('Both Teams Score', {})
            plotting_data['btts_chart']['series'].append({
                'name': model_name,
                'data': [
                    btts.get('Yes', 0.0),
                    btts.get('No', 0.0)
                ]
            })
            
            # Double Chance
            double_chance = model_data.get('Double Chance', {})
            plotting_data['double_chance_chart']['series'].append({
                'name': model_name,
                'data': [
                    double_chance.get('Home/Draw', 0.0),
                    double_chance.get('Draw/Away', 0.0),
                    double_chance.get('Home/Away', 0.0)
                ]
            })
        
        return plotting_data

    def create_team_summary(self, fixture_data: Dict, prob_results: Dict) -> Dict[str, Any]:
        """Creates a comprehensive JSON summary for a fixture."""
        home_team = fixture_data.get('home_team', 'Home Team')
        away_team = fixture_data.get('away_team', 'Away Team')
        fixture_id = fixture_data.get('fixture_id', 'Unknown')
        
        summary = {
            'fixture_info': {
                'fixture_id': fixture_id,
                'home_team': home_team,
                'away_team': away_team,
                'home_team_logo': fixture_data.get('home_team_logo'),
                'away_team_logo': fixture_data.get('away_team_logo'),
                'league_name': fixture_data.get('league_name'),
                'date': fixture_data.get('date_str'),
                'analysis_timestamp': datetime.now().isoformat()
            },
            'expected_goals': prob_results['lambdas'],
            'match_outcome_probabilities': {},
            'all_market_probabilities': {},
            'reasoning': ''
        }
        
        # Extract simplified outcome probabilities for backward compatibility
        models = ['monte_carlo', 'analytical_poisson', 'bivariate_poisson']
        key_map = {
            'monte_carlo': ('prob_H', 'prob_D', 'prob_A', 'prob_O25', 'prob_BTTS_Y'),
            'analytical_poisson': ('poisson_prob_H', 'poisson_prob_D', 'poisson_prob_A', 'poisson_prob_O2.5', 'poisson_prob_BTTS_Yes'),
            'bivariate_poisson': ('biv_poisson_prob_H', 'biv_poisson_prob_D', 'biv_poisson_prob_A', 'biv_poisson_prob_O2.5', 'biv_poisson_prob_BTTS_Yes')
        }

        for model in models:
            model_probs = prob_results['probabilities'].get(model, {})
            if not model_probs: continue
            
            h_key, d_key, a_key, o25_key, btts_key = key_map[model]
            summary['match_outcome_probabilities'][model] = {
                'home_win': model_probs.get(h_key, 0.0),
                'draw': model_probs.get(d_key, 0.0),
                'away_win': model_probs.get(a_key, 0.0),
                'over_2_5_goals': model_probs.get(o25_key, 0.0),
                'both_teams_score': model_probs.get(btts_key, 0.0)
            }
        
        # Extract ALL market probabilities using market_mapper.py
        summary['all_market_probabilities'] = self.extract_all_market_probabilities(prob_results)
        
        # Generate comprehensive plotting data
        summary['plotting_data'] = self.generate_comprehensive_plotting_data(summary)
        
        # Generate reasoning for the match
        summary['reasoning'] = self.generate_match_reasoning(fixture_data, summary)
        
        return summary
    
    async def generate_fixture_analysis(self, fixture_id: str) -> Optional[Dict]:
        """Main method to generate and return analysis for a given fixture ID."""
        try:
            # Use existing DB connection (singleton pattern - don't close it)
            db_manager = MongoDBManager()
            match_data = db_manager.get_match_data(fixture_id)
            # Note: Don't close the connection here as it's a singleton used by other parts
            
            if not match_data:
                return None

            home_team_dict = match_data.get('home_team', {})
            away_team_dict = match_data.get('away_team', {})
            
            fixture_data = {
                'fixture_id': fixture_id,
                'home_team': home_team_dict.get('name', 'Home Team'),
                'away_team': away_team_dict.get('name', 'Away Team'),
                'home_team_id': int(home_team_dict.get('id')) if home_team_dict.get('id') else None,
                'away_team_id': int(away_team_dict.get('id')) if away_team_dict.get('id') else None,
                'home_team_logo': home_team_dict.get('logo'),
                'away_team_logo': away_team_dict.get('logo'),
                'date_str': match_data.get('date_str'),
                'league_id': int(match_data.get('league_id')) if match_data.get('league_id') else None,
                'league_name': match_data.get('league_name'),
                'raw_data': match_data
            }
            
            lambda_home, lambda_away = self.get_simple_lambdas(fixture_data)
            prob_results = self.calculate_all_probabilities(lambda_home, lambda_away)
            team_summary = self.create_team_summary(fixture_data, prob_results)
            
            return team_summary
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return None

    def generate_match_reasoning(self, fixture_data: Dict, summary: Dict[str, Any]) -> str:
        """Generate AI-powered reasoning for the match prediction."""
        try:
            home_team = fixture_data.get('home_team', 'Home Team')
            away_team = fixture_data.get('away_team', 'Away Team')
            
            # Get expected goals
            expected_goals = summary.get('expected_goals', {})
            home_xg = expected_goals.get('home', 0)
            away_xg = expected_goals.get('away', 0)
            
            # Get Monte Carlo probabilities (most reliable model)
            mc_probs = summary.get('match_outcome_probabilities', {}).get('monte_carlo', {})
            home_win_prob = mc_probs.get('home_win', 0) * 100
            draw_prob = mc_probs.get('draw', 0) * 100
            away_win_prob = mc_probs.get('away_win', 0) * 100
            btts_prob = mc_probs.get('both_teams_score', 0) * 100
            over25_prob = mc_probs.get('over_2_5_goals', 0) * 100
            
            # Determine the most likely outcome
            outcomes = [
                (home_win_prob, f"{home_team} victory"),
                (draw_prob, "a draw"),
                (away_win_prob, f"{away_team} victory")
            ]
            top_outcome = max(outcomes, key=lambda x: x[0])
            
            # Goal difference analysis
            goal_diff = abs(home_xg - away_xg)
            
            # Build reasoning
            reasoning_parts = []
            
            # Main prediction
            reasoning_parts.append(f"Our advanced Monte Carlo simulation predicts {top_outcome[1]} as the most likely outcome with {top_outcome[0]:.1f}% probability.")
            
            # Expected goals analysis
            if goal_diff > 0.5:
                stronger_team = home_team if home_xg > away_xg else away_team
                reasoning_parts.append(f"Expected goals favor {stronger_team} ({home_xg:.2f} vs {away_xg:.2f}), indicating a significant attacking advantage.")
            else:
                reasoning_parts.append(f"Expected goals are closely matched ({home_xg:.2f} vs {away_xg:.2f}), suggesting a competitive encounter.")
            
            # Goals market analysis
            if over25_prob > 65:
                reasoning_parts.append(f"High-scoring match expected with {over25_prob:.1f}% chance of over 2.5 goals.")
            elif over25_prob < 35:
                reasoning_parts.append(f"Low-scoring affair anticipated with only {over25_prob:.1f}% probability of over 2.5 goals.")
            
            # BTTS analysis
            if btts_prob > 60:
                reasoning_parts.append(f"Both teams likely to find the net ({btts_prob:.1f}% BTTS probability).")
            elif btts_prob < 40:
                reasoning_parts.append(f"Clean sheet potential exists with {100-btts_prob:.1f}% chance of one team failing to score.")
            
            # Home advantage consideration
            if home_xg > away_xg + 0.3:
                reasoning_parts.append(f"Home advantage appears significant in this matchup.")
            
            # Uncertainty analysis
            outcome_spread = max(home_win_prob, draw_prob, away_win_prob) - min(home_win_prob, draw_prob, away_win_prob)
            if outcome_spread < 30:
                reasoning_parts.append("This is a highly unpredictable match with multiple possible outcomes.")
            
            return " ".join(reasoning_parts)
            
        except Exception as e:
            # Fallback reasoning
            return f"Statistical analysis suggests a competitive match between {fixture_data.get('home_team', 'the home team')} and {fixture_data.get('away_team', 'the away team')}. Expected goals and probability models indicate balanced attacking potential from both sides."

async def main():
    """For testing the generator directly."""
    tester = FixtureAnalysisGenerator()
    
    # Use a fixture ID from your database for testing
    fixture_id_to_test = "1375442" 
    result = await tester.generate_fixture_analysis(fixture_id_to_test)
    
    if result:
        print(json.dumps(result, indent=2, default=str))
    else:
        print(f"\n❌ Failed to generate analysis for fixture {fixture_id_to_test}")

if __name__ == "__main__":
    asyncio.run(main()) 