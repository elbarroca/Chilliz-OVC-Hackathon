import logging
import pandas as pd
import numpy as np
import xgboost as xgb
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class GradientBoostingPredictor:
    """
    Uses a pre-trained Gradient Boosting model (XGBoost) to predict match outcomes.
    """

    def __init__(self, model_path: str):
        """
        Initializes the predictor by loading a pre-trained XGBoost model.

        Args:
            model_path: The file path to the saved XGBoost model (.json or .bin).
        """
        self.model_path = model_path
        self.model = self._load_model()
        self.feature_names = [
            # Example features - this list must match the model's training features
            'home_elo', 'away_elo', 'elo_diff',
            'h_form_ppg', 'a_form_ppg', 'h_win_streak', 'a_win_streak',
            'h_loss_streak', 'a_loss_streak', 'h_avg_gs_l15', 'a_avg_gs_l15',
            'h_avg_gc_l15', 'a_avg_gc_l15'
        ]

    def _load_model(self) -> Optional[xgb.Booster]:
        """Loads the XGBoost model from the specified path."""
        try:
            model = xgb.Booster()
            model.load_model(self.model_path)
            logger.info(f"Successfully loaded XGBoost model from {self.model_path}")
            # The model should have feature names stored if saved correctly after training
            if model.feature_names:
                self.feature_names = model.feature_names
            else:
                 logger.warning(f"Model from {self.model_path} does not contain feature names. Using default list.")
            return model
        except xgb.core.XGBoostError as e:
            logger.error(f"Error loading XGBoost model from {self.model_path}: {e}", exc_info=True)
            logger.error("Please ensure a trained model exists at the specified path.")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred while loading the model: {e}", exc_info=True)
            return None

    def prepare_features(self, fixture_data: Dict[str, Any]) -> Optional[pd.DataFrame]:
        """
        Prepares a feature vector from the raw fixture data JSON.
        This needs to be perfectly aligned with the features used for training.

        Args:
            fixture_data: The JSON data for a single fixture.

        Returns:
            A pandas DataFrame with a single row containing the features, or None if failed.
        """
        if not isinstance(fixture_data, dict):
            logger.error("fixture_data must be a dictionary.")
            return None

        # Helper to safely extract nested data
        def safe_get(data: Dict, keys: List[str], default: Any = np.nan) -> Any:
            for key in keys:
                try:
                    data = data[key]
                except (KeyError, TypeError, IndexError):
                    return default
            return data if data is not None else default

        try:
            features = {}

            # Elo features
            features['home_elo'] = safe_get(fixture_data, ['engineered_features', 'home', 'elo_rating'])
            features['away_elo'] = safe_get(fixture_data, ['engineered_features', 'away', 'elo_rating'])
            if pd.notna(features['home_elo']) and pd.notna(features['away_elo']):
                features['elo_diff'] = features['home_elo'] - features['away_elo']
            else:
                features['elo_diff'] = np.nan

            # Form features (example from predict_games.py)
            home_form_str = safe_get(fixture_data, ['raw_data', 'home', 'basic_info', 'form'], '')
            away_form_str = safe_get(fixture_data, ['raw_data', 'away', 'basic_info', 'form'], '')

            def parse_form(form_str: str, num_matches: int = 5):
                if not form_str: return 0, 0, 0, 0.0
                relevant_form = form_str[-num_matches:]
                points = sum(3 for c in relevant_form if c == 'W') + sum(1 for c in relevant_form if c == 'D')
                matches_counted = len(relevant_form.replace('-', '')) # Assuming '-' means no match data
                form_ppg = (points / matches_counted) if matches_counted > 0 else 0.0
                win_streak = len(form_str) - len(form_str.rstrip('W'))
                loss_streak = len(form_str) - len(form_str.rstrip('L'))
                return win_streak, loss_streak, form_ppg

            h_ws, h_ls, h_fppg = parse_form(home_form_str)
            a_ws, a_ls, a_fppg = parse_form(away_form_str)

            features['h_form_ppg'] = h_fppg
            features['a_form_ppg'] = a_fppg
            features['h_win_streak'] = h_ws
            features['a_win_streak'] = a_ws
            features['h_loss_streak'] = h_ls
            features['a_loss_streak'] = a_ls
            
            # Goal stats from last 15 games (example path)
            features['h_avg_gs_l15'] = safe_get(fixture_data, ['raw_data', 'home', 'match_processor_snapshot', 'goals', 'for', 'average', 'total'])
            features['a_avg_gs_l15'] = safe_get(fixture_data, ['raw_data', 'away', 'match_processor_snapshot', 'goals', 'for', 'average', 'total'])
            features['h_avg_gc_l15'] = safe_get(fixture_data, ['raw_data', 'home', 'match_processor_snapshot', 'goals', 'against', 'average', 'total'])
            features['a_avg_gc_l15'] = safe_get(fixture_data, ['raw_data', 'away', 'match_processor_snapshot', 'goals', 'against', 'average', 'total'])


            # Create a DataFrame with the correct feature order
            feature_df = pd.DataFrame([features], columns=self.feature_names)

            # Check for missing values
            if feature_df.isnull().values.any():
                missing_cols = feature_df.columns[feature_df.isnull().any()].tolist()
                logger.warning(f"Missing values found for features: {missing_cols}. Prediction may be unreliable.")
                # Depending on model training, you might need to fill NaNs, e.g., feature_df.fillna(0, inplace=True)
            
            return feature_df

        except Exception as e:
            logger.error(f"Failed to prepare features for fixture: {e}", exc_info=True)
            return None

    def predict(self, fixture_data: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """
        Prepares features and runs the prediction with the loaded model.

        Args:
            fixture_data: The JSON data for a single fixture.

        Returns:
            A dictionary of predicted probabilities for various outcomes, or None if failed.
        """
        if self.model is None:
            logger.error("Cannot predict: XGBoost model is not loaded.")
            return None

        features_df = self.prepare_features(fixture_data)
        if features_df is None:
            logger.error("Cannot predict: Failed to prepare features.")
            return None

        try:
            # The model should be a multi-output regressor predicting home_goals and away_goals
            # The output of predict will be of shape (n_samples, n_outputs)
            predicted_goals = self.model.predict(features_df)

            if predicted_goals.shape[1] != 2:
                logger.error(f"Model prediction has shape {predicted_goals.shape}, but expected 2 outputs (home_goals, away_goals).")
                return None
            
            lambda_home = max(0.01, predicted_goals[0, 0]) # XGBoost can predict negative, ensure positive lambda
            lambda_away = max(0.01, predicted_goals[0, 1])
            
            logger.info(f"XGBoost predicted lambdas: Home={lambda_home:.3f}, Away={lambda_away:.3f}")

            # Now, use these lambdas to run a Monte Carlo simulation to get probabilities
            # This re-uses the existing, powerful simulation logic
            from .predict_games import run_monte_carlo_simulation

            mc_probs, _ = run_monte_carlo_simulation(lambda_home, lambda_away, num_simulations=10000) # Use a smaller sim count for speed here
            
            # Rename keys to be prefixed with 'xgb_'
            xgb_results = {f"xgb_{k.replace('prob_', '')}": v for k, v in mc_probs.items()}
            
            # Add the core predicted lambdas
            xgb_results['xgb_expected_HG'] = lambda_home
            xgb_results['xgb_expected_AG'] = lambda_away

            return xgb_results

        except Exception as e:
            logger.error(f"An error occurred during XGBoost prediction: {e}", exc_info=True)
            return None 