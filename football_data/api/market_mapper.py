"""
This module provides a mapping from the internal prediction probability keys
(e.g., 'prob_H', 'prob_O25') to the market names and selection values used
by the API odds provider (e.g., Bet365). This is crucial for correctly
calculating edge by matching our probabilities with the right odds.
"""

# The bookmaker ID for Bet365 is "8" in the API aoi-football
# The market IDs can vary, so we rely on market names.

MARKET_MAPPING = {
    # --- Main Markets ---
    'prob_H': {'market_name': 'Match Winner', 'selection_value': 'Home'},
    'prob_D': {'market_name': 'Match Winner', 'selection_value': 'Draw'},
    'prob_A': {'market_name': 'Match Winner', 'selection_value': 'Away'},
    'prob_1X': {'market_name': 'Double Chance', 'selection_value': 'Home/Draw'},
    'prob_X2': {'market_name': 'Double Chance', 'selection_value': 'Draw/Away'},
    'prob_12': {'market_name': 'Double Chance', 'selection_value': 'Home/Away'},
    'prob_BTTS_Y': {'market_name': 'Both Teams Score', 'selection_value': 'Yes'},
    'prob_BTTS_N': {'market_name': 'Both Teams Score', 'selection_value': 'No'},
    # --- Goal Lines (Over/Under) ---
    'prob_O15': {'market_name': 'Goals Over/Under', 'selection_value': 'Over 1.5'},
    'prob_U15': {'market_name': 'Goals Over/Under', 'selection_value': 'Under 1.5'},
    'prob_O25': {'market_name': 'Goals Over/Under', 'selection_value': 'Over 2.5'},
    'prob_U25': {'market_name': 'Goals Over/Under', 'selection_value': 'Under 2.5'},
    'prob_O35': {'market_name': 'Goals Over/Under', 'selection_value': 'Over 3.5'},
    'prob_U35': {'market_name': 'Goals Over/Under', 'selection_value': 'Under 3.5'},
    'prob_O45': {'market_name': 'Goals Over/Under', 'selection_value': 'Over 4.5'},
    'prob_U45': {'market_name': 'Goals Over/Under', 'selection_value': 'Under 4.5'},

    # --- Goal Range Markets ---
    'prob_goals_0_1': {'market_name': 'Total Goals', 'selection_value': '0-1'},
    'prob_goals_2_3': {'market_name': 'Total Goals', 'selection_value': '2-3'},
    'prob_goals_2_4': {'market_name': 'Total Goals', 'selection_value': '2-4'},
    'prob_goals_3_plus': {'market_name': 'Total Goals', 'selection_value': '3+'},

    # --- Result + Over/Under 1.5 ---
    'prob_H_and_O15': {'market_name': 'Match Result and Over/Under 1.5', 'selection_value': 'Home and Over 1.5'},
    'prob_D_and_O15': {'market_name': 'Match Result and Over/Under 1.5', 'selection_value': 'Draw and Over 1.5'},
    'prob_A_and_O15': {'market_name': 'Match Result and Over/Under 1.5', 'selection_value': 'Away and Over 1.5'},
    'prob_H_and_U15': {'market_name': 'Match Result and Over/Under 1.5', 'selection_value': 'Home and Under 1.5'},
    'prob_D_and_U15': {'market_name': 'Match Result and Over/Under 1.5', 'selection_value': 'Draw and Under 1.5'},
    'prob_A_and_U15': {'market_name': 'Match Result and Over/Under 1.5', 'selection_value': 'Away and Under 1.5'},

    # --- Result + Over/Under 2.5 ---
    'prob_H_and_O25': {'market_name': 'Match Result and Over/Under 2.5', 'selection_value': 'Home and Over 2.5'},
    'prob_D_and_O25': {'market_name': 'Match Result and Over/Under 2.5', 'selection_value': 'Draw and Over 2.5'},
    'prob_A_and_O25': {'market_name': 'Match Result and Over/Under 2.5', 'selection_value': 'Away and Over 2.5'},
    'prob_H_and_U25': {'market_name': 'Match Result and Over/Under 2.5', 'selection_value': 'Home and Under 2.5'},
    'prob_D_and_U25': {'market_name': 'Match Result and Over/Under 2.5', 'selection_value': 'Draw and Under 2.5'},
    'prob_A_and_U25': {'market_name': 'Match Result and Over/Under 2.5', 'selection_value': 'Away and Under 2.5'},

    # --- Result + Over/Under 3.5 ---
    'prob_H_and_O35': {'market_name': 'Match Result and Over/Under 3.5', 'selection_value': 'Home and Over 3.5'},
    'prob_D_and_O35': {'market_name': 'Match Result and Over/Under 3.5', 'selection_value': 'Draw and Over 3.5'},
    'prob_A_and_O35': {'market_name': 'Match Result and Over/Under 3.5', 'selection_value': 'Away and Over 3.5'},
    'prob_H_and_U35': {'market_name': 'Match Result and Over/Under 3.5', 'selection_value': 'Home and Under 3.5'},
    'prob_D_and_U35': {'market_name': 'Match Result and Over/Under 3.5', 'selection_value': 'Draw and Under 3.5'},
    'prob_A_and_U35': {'market_name': 'Match Result and Over/Under 3.5', 'selection_value': 'Away and Under 3.5'},

    # --- Result + Over/Under 4.5 ---
    'prob_H_and_O45': {'market_name': 'Match Result and Over/Under 4.5', 'selection_value': 'Home and Over 4.5'},
    'prob_D_and_O45': {'market_name': 'Match Result and Over/Under 4.5', 'selection_value': 'Draw and Over 4.5'},
    'prob_A_and_O45': {'market_name': 'Match Result and Over/Under 4.5', 'selection_value': 'Away and Over 4.5'},
    'prob_H_and_U45': {'market_name': 'Match Result and Over/Under 4.5', 'selection_value': 'Home and Under 4.5'},
    'prob_D_and_U45': {'market_name': 'Match Result and Over/Under 4.5', 'selection_value': 'Draw and Under 4.5'},
    'prob_A_and_U45': {'market_name': 'Match Result and Over/Under 4.5', 'selection_value': 'Away and Under 4.5'},

    # --- Double Chance + Over/Under 1.5 ---
    'prob_1X_and_O15': {'market_name': 'Double Chance and Over/Under 1.5', 'selection_value': 'Home/Draw and Over 1.5'},
    'prob_12_and_O15': {'market_name': 'Double Chance and Over/Under 1.5', 'selection_value': 'Home/Away and Over 1.5'},
    'prob_X2_and_O15': {'market_name': 'Double Chance and Over/Under 1.5', 'selection_value': 'Draw/Away and Over 1.5'},
    'prob_1X_and_U15': {'market_name': 'Double Chance and Over/Under 1.5', 'selection_value': 'Home/Draw and Under 1.5'},
    'prob_12_and_U15': {'market_name': 'Double Chance and Over/Under 1.5', 'selection_value': 'Home/Away and Under 1.5'},
    'prob_X2_and_U15': {'market_name': 'Double Chance and Over/Under 1.5', 'selection_value': 'Draw/Away and Under 1.5'},

    # --- Double Chance + Over/Under 2.5 ---
    'prob_1X_and_O25': {'market_name': 'Double Chance and Over/Under 2.5', 'selection_value': 'Home/Draw and Over 2.5'},
    'prob_12_and_O25': {'market_name': 'Double Chance and Over/Under 2.5', 'selection_value': 'Home/Away and Over 2.5'},
    'prob_X2_and_O25': {'market_name': 'Double Chance and Over/Under 2.5', 'selection_value': 'Draw/Away and Over 2.5'},
    'prob_1X_and_U25': {'market_name': 'Double Chance and Over/Under 2.5', 'selection_value': 'Home/Draw and Under 2.5'},
    'prob_12_and_U25': {'market_name': 'Double Chance and Over/Under 2.5', 'selection_value': 'Home/Away and Under 2.5'},
    'prob_X2_and_U25': {'market_name': 'Double Chance and Over/Under 2.5', 'selection_value': 'Draw/Away and Under 2.5'},

    # --- Double Chance + Over/Under 3.5 ---
    'prob_1X_and_O35': {'market_name': 'Double Chance and Over/Under 3.5', 'selection_value': 'Home/Draw and Over 3.5'},
    'prob_12_and_O35': {'market_name': 'Double Chance and Over/Under 3.5', 'selection_value': 'Home/Away and Over 3.5'},
    'prob_X2_and_O35': {'market_name': 'Double Chance and Over/Under 3.5', 'selection_value': 'Draw/Away and Over 3.5'},
    'prob_1X_and_U35': {'market_name': 'Double Chance and Over/Under 3.5', 'selection_value': 'Home/Draw and Under 3.5'},
    'prob_12_and_U35': {'market_name': 'Double Chance and Over/Under 3.5', 'selection_value': 'Home/Away and Under 3.5'},
    'prob_X2_and_U35': {'market_name': 'Double Chance and Over/Under 3.5', 'selection_value': 'Draw/Away and Under 3.5'},

    # --- Double Chance + Over/Under 4.5 ---
    'prob_1X_and_O45': {'market_name': 'Double Chance and Over/Under 4.5', 'selection_value': 'Home/Draw and Over 4.5'},
    'prob_12_and_O45': {'market_name': 'Double Chance and Over/Under 4.5', 'selection_value': 'Home/Away and Over 4.5'},
    'prob_X2_and_O45': {'market_name': 'Double Chance and Over/Under 4.5', 'selection_value': 'Draw/Away and Over 4.5'},
    'prob_1X_and_U45': {'market_name': 'Double Chance and Over/Under 4.5', 'selection_value': 'Home/Draw and Under 4.5'},
    'prob_12_and_U45': {'market_name': 'Double Chance and Over/Under 4.5', 'selection_value': 'Home/Away and Under 4.5'},
    'prob_X2_and_U45': {'market_name': 'Double Chance and Over/Under 4.5', 'selection_value': 'Draw/Away and Under 4.5'},

    # --- Result + Both Teams Score ---
    'prob_H_and_BTTS_Y': {'market_name': 'Match Result and Both Teams Score', 'selection_value': 'Home and Yes'},
    'prob_D_and_BTTS_Y': {'market_name': 'Match Result and Both Teams Score', 'selection_value': 'Draw and Yes'},
    'prob_A_and_BTTS_Y': {'market_name': 'Match Result and Both Teams Score', 'selection_value': 'Away and Yes'},
    'prob_H_and_BTTS_N': {'market_name': 'Match Result and Both Teams Score', 'selection_value': 'Home and No'},
    'prob_D_and_BTTS_N': {'market_name': 'Match Result and Both Teams Score', 'selection_value': 'Draw and No'},
    'prob_A_and_BTTS_N': {'market_name': 'Match Result and Both Teams Score', 'selection_value': 'Away and No'},

    # --- Double Chance + Both Teams Score ---
    'prob_1X_and_BTTS_Y': {'market_name': 'Double Chance and Both Teams Score', 'selection_value': 'Home/Draw and Yes'},
    'prob_12_and_BTTS_Y': {'market_name': 'Double Chance and Both Teams Score', 'selection_value': 'Home/Away and Yes'},
    'prob_X2_and_BTTS_Y': {'market_name': 'Double Chance and Both Teams Score', 'selection_value': 'Draw/Away and Yes'},
    'prob_1X_and_BTTS_N': {'market_name': 'Double Chance and Both Teams Score', 'selection_value': 'Home/Draw and No'},
    'prob_12_and_BTTS_N': {'market_name': 'Double Chance and Both Teams Score', 'selection_value': 'Home/Away and No'},
    'prob_X2_and_BTTS_N': {'market_name': 'Double Chance and Both Teams Score', 'selection_value': 'Draw/Away and No'},

    # --- Over/Under + Both Teams Score ---
    'prob_O25_and_BTTS_Y': {'market_name': 'Over/Under 2.5 and Both Teams Score', 'selection_value': 'Over 2.5 and Yes'},
    'prob_O25_and_BTTS_N': {'market_name': 'Over/Under 2.5 and Both Teams Score', 'selection_value': 'Over 2.5 and No'},
    'prob_O35_and_BTTS_Y': {'market_name': 'Over/Under 3.5 and Both Teams Score', 'selection_value': 'Over 3.5 and Yes'},
    'prob_O35_and_BTTS_N': {'market_name': 'Over/Under 3.5 and Both Teams Score', 'selection_value': 'Over 3.5 and No'},
}
def get_market_and_selection(prob_key: str):
    """
    Returns the corresponding market name and selection value for a given probability key.
    """
    return MARKET_MAPPING.get(prob_key) 