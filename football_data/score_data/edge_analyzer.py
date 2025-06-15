"""
Edge Analysis Module for AlphaSteam Football Betting

This module analyzes the relationship between model predictions and bookmaker odds
to identify value betting opportunities (positive expected value bets).
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime

logger = logging.getLogger(__name__)

class EdgeAnalyzer:
    """
    Analyzes predictions vs odds to find value betting opportunities.
    """
    
    def __init__(self, bookmaker_name: str = "Bet365"):
        self.bookmaker_name = bookmaker_name
        self.min_edge_threshold = 0.05  # 5% minimum edge
        self.min_probability_threshold = 0.1  # 10% minimum probability
        
        # Market mappings for different prediction types to odds markets
        self.market_mappings = {
            # Match Winner mappings
            "home_win": {
                "market_name": "Match Winner",
                "selection_value": "Home",
                "description": "Home team to win"
            },
            "draw": {
                "market_name": "Match Winner", 
                "selection_value": "Draw",
                "description": "Match to end in a draw"
            },
            "away_win": {
                "market_name": "Match Winner",
                "selection_value": "Away", 
                "description": "Away team to win"
            },
            # Goals Over/Under mappings
            "over_0_5": {
                "market_name": "Goals Over/Under",
                "selection_value": "Over 0.5",
                "description": "Over 0.5 goals in match"
            },
            "over_1_5": {
                "market_name": "Goals Over/Under",
                "selection_value": "Over 1.5",
                "description": "Over 1.5 goals in match"
            },
            "over_2_5": {
                "market_name": "Goals Over/Under",
                "selection_value": "Over 2.5",
                "description": "Over 2.5 goals in match"
            },
            "over_3_5": {
                "market_name": "Goals Over/Under",
                "selection_value": "Over 3.5",
                "description": "Over 3.5 goals in match"
            },
            "under_0_5": {
                "market_name": "Goals Over/Under",
                "selection_value": "Under 0.5",
                "description": "Under 0.5 goals in match"
            },
            "under_1_5": {
                "market_name": "Goals Over/Under",
                "selection_value": "Under 1.5",
                "description": "Under 1.5 goals in match"
            },
            "under_2_5": {
                "market_name": "Goals Over/Under",
                "selection_value": "Under 2.5",
                "description": "Under 2.5 goals in match"
            },
            "under_3_5": {
                "market_name": "Goals Over/Under",
                "selection_value": "Under 3.5",
                "description": "Under 3.5 goals in match"
            },
            # Both Teams to Score
            "btts_yes": {
                "market_name": "Both Teams To Score",
                "selection_value": "Yes",
                "description": "Both teams to score"
            },
            "btts_no": {
                "market_name": "Both Teams To Score",
                "selection_value": "No",
                "description": "Both teams not to score"
            }
        }

    def calculate_implied_probability(self, odds: float) -> float:
        """
        Calculate implied probability from decimal odds.
        
        Args:
            odds: Decimal odds (e.g., 2.50)
            
        Returns:
            Implied probability as a float (e.g., 0.4 for 40%)
        """
        if odds <= 0:
            return 0.0
        return 1.0 / odds

    def calculate_edge(self, model_probability: float, odds: float) -> float:
        """
        Calculate the edge (expected value) of a bet.
        
        Edge = (Model Probability × Odds) - 1
        
        Args:
            model_probability: Our model's probability estimate (0-1)
            odds: Bookmaker's decimal odds
            
        Returns:
            Edge as a float. Positive values indicate value bets.
        """
        if model_probability <= 0 or odds <= 0:
            return -1.0
        
        return (model_probability * odds) - 1.0

    def extract_bookmaker_odds(self, odds_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extract odds for the specified bookmaker from odds data.
        
        Args:
            odds_data: Raw odds data from database
            
        Returns:
            Bookmaker's odds data or None if not found
        """
        if not odds_data:
            return None
            
        # Handle different odds data structures
        bookmakers = odds_data.get("bookmakers", [])
        
        # Check if bookmakers is a list of bookmaker objects
        if isinstance(bookmakers, list):
            for bookmaker in bookmakers:
                if isinstance(bookmaker, dict):
                    # Check direct bookmaker name
                    if bookmaker.get("name") == self.bookmaker_name:
                        return bookmaker
                    
                    # Check nested bookmaker structure
                    if "bookmakers" in bookmaker:
                        nested_bookmakers = bookmaker.get("bookmakers", [])
                        for nested in nested_bookmakers:
                            if isinstance(nested, dict) and nested.get("name") == self.bookmaker_name:
                                return nested
        
        # Check if the root data is the bookmaker data directly
        if isinstance(odds_data, dict) and odds_data.get("name") == self.bookmaker_name:
            return odds_data
            
        logger.debug(f"Could not find {self.bookmaker_name} odds in data structure")
        return None

    def find_market_odds(self, bookmaker_data: Dict[str, Any], market_name: str, selection_value: str) -> Optional[float]:
        """
        Find odds for a specific market and selection.
        
        Args:
            bookmaker_data: Bookmaker's odds data
            market_name: Name of the betting market
            selection_value: Specific selection within the market
            
        Returns:
            Decimal odds as float or None if not found
        """
        if not bookmaker_data:
            return None
            
        bets = bookmaker_data.get("bets", [])
        if not isinstance(bets, list):
            return None
            
        # Find the market
        market = None
        for bet in bets:
            if isinstance(bet, dict) and bet.get("name") == market_name:
                market = bet
                break
                
        if not market:
            logger.debug(f"Market '{market_name}' not found")
            return None
            
        # Find the selection within the market
        values = market.get("values", [])
        if not isinstance(values, list):
            return None
            
        for value in values:
            if isinstance(value, dict) and value.get("value") == selection_value:
                try:
                    odds = float(value.get("odd", 0))
                    if odds > 0:
                        return odds
                except (ValueError, TypeError):
                    logger.warning(f"Could not parse odds '{value.get('odd')}' for {market_name} - {selection_value}")
                    continue
                    
        logger.debug(f"Selection '{selection_value}' not found in market '{market_name}'")
        return None

    def extract_model_probabilities(self, prediction_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Extract and normalize model probabilities from prediction data.
        
        Args:
            prediction_data: Prediction results from the model
            
        Returns:
            Dictionary of normalized probabilities
        """
        probabilities = {}
        
        # Extract Monte Carlo probabilities (primary source)
        mc_probs = prediction_data.get("mc_probs", {})
        if isinstance(mc_probs, dict):
            for key, value in mc_probs.items():
                if isinstance(value, (int, float)) and 0 <= value <= 1:
                    probabilities[key] = float(value)
        
        # Extract Elo probabilities as backup
        elo_probs = prediction_data.get("elo_probs", {})
        if isinstance(elo_probs, dict):
            for key, value in elo_probs.items():
                if key not in probabilities and isinstance(value, (int, float)) and 0 <= value <= 1:
                    probabilities[f"elo_{key}"] = float(value)
        
        # Extract Gradient Boosting probabilities
        gb_probs = prediction_data.get("gb_probs", {})
        if isinstance(gb_probs, dict):
            for key, value in gb_probs.items():
                if key not in probabilities and isinstance(value, (int, float)) and 0 <= value <= 1:
                    probabilities[f"gb_{key}"] = float(value)
        
        return probabilities

    def analyze_fixture(self, fixture_id: str, prediction_data: Dict[str, Any], odds_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Analyze a single fixture for value betting opportunities.
        
        Args:
            fixture_id: Fixture identifier
            prediction_data: Model predictions
            odds_data: Bookmaker odds data
            
        Returns:
            List of value betting opportunities
        """
        value_bets = []
        
        # Extract bookmaker odds
        bookmaker_data = self.extract_bookmaker_odds(odds_data)
        if not bookmaker_data:
            logger.debug(f"No {self.bookmaker_name} odds found for fixture {fixture_id}")
            return value_bets
        
        # Extract model probabilities
        model_probs = self.extract_model_probabilities(prediction_data)
        if not model_probs:
            logger.debug(f"No valid probabilities found for fixture {fixture_id}")
            return value_bets
        
        # Check each probability against corresponding odds
        for prob_key, probability in model_probs.items():
            if probability < self.min_probability_threshold:
                continue
                
            # Find corresponding market mapping
            market_info = self.market_mappings.get(prob_key)
            if not market_info:
                continue
                
            # Get odds for this market/selection
            odds = self.find_market_odds(
                bookmaker_data,
                market_info["market_name"],
                market_info["selection_value"]
            )
            
            if not odds:
                continue
                
            # Calculate edge
            edge = self.calculate_edge(probability, odds)
            
            # Check if this is a value bet
            if edge >= self.min_edge_threshold:
                implied_prob = self.calculate_implied_probability(odds)
                
                value_bet = {
                    "fixture_id": fixture_id,
                    "home_team": prediction_data.get("home_team", "Unknown"),
                    "away_team": prediction_data.get("away_team", "Unknown"),
                    "market": market_info["market_name"],
                    "selection": market_info["selection_value"],
                    "description": market_info["description"],
                    "model_probability": round(probability, 4),
                    "implied_probability": round(implied_prob, 4),
                    "odds": odds,
                    "edge": round(edge, 4),
                    "edge_percentage": round(edge * 100, 2),
                    "probability_source": prob_key,
                    "bookmaker": self.bookmaker_name
                }
                
                value_bets.append(value_bet)
                logger.info(f"Value bet found: {fixture_id} - {market_info['description']} - Edge: {edge:.2%}")
        
        return value_bets

    def analyze_date(self, date_str: str, fixtures_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze all fixtures for a given date.
        
        Args:
            date_str: Date in YYYY-MM-DD format
            fixtures_data: List of fixture data with predictions and odds
            
        Returns:
            Analysis results with value bets and summary statistics
        """
        all_value_bets = []
        analyzed_fixtures = 0
        fixtures_with_value = 0
        
        for fixture_data in fixtures_data:
            fixture_id = fixture_data.get("fixture_id")
            prediction_data = fixture_data.get("predictions")
            odds_data = fixture_data.get("odds")
            
            if not all([fixture_id, prediction_data, odds_data]):
                continue
                
            analyzed_fixtures += 1
            
            # Analyze this fixture
            fixture_value_bets = self.analyze_fixture(fixture_id, prediction_data, odds_data)
            
            if fixture_value_bets:
                fixtures_with_value += 1
                all_value_bets.extend(fixture_value_bets)
        
        # Sort by edge (highest first)
        all_value_bets.sort(key=lambda x: x["edge"], reverse=True)
        
        # Calculate summary statistics
        total_edge = sum(bet["edge"] for bet in all_value_bets)
        avg_edge = total_edge / len(all_value_bets) if all_value_bets else 0
        
        return {
            "date": date_str,
            "analyzed_fixtures": analyzed_fixtures,
            "fixtures_with_value": fixtures_with_value,
            "total_value_bets": len(all_value_bets),
            "average_edge": round(avg_edge, 4),
            "total_edge": round(total_edge, 4),
            "value_bets": all_value_bets,
            "analysis_timestamp": datetime.utcnow().isoformat()
        } 