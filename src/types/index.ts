export interface Team {
    name: string;
    slug: string;
    logoUrl: string;
  }
  
  export interface Match {
    _id: string;
    matchId: number;
    teamA: Team;
    teamB: Team;
    matchTime: string; // ISO Date String
    league?: {
      name: string;
      logoUrl: string;
    };
    status: 'UPCOMING' | 'LIVE' | 'ENDED';
    alphaPredictions: {
      winA_prob: number;
      draw_prob: number;
      winB_prob: number;
    };
    // Enhanced with Python API data
    analysisData?: MatchAnalysisData;
  }

// Enhanced market data from Python API
export interface MarketProbabilities {
  home_win: number;
  draw: number;
  away_win: number;
  over_2_5_goals: number;
  both_teams_score: number;
}

export interface AllMarketProbabilities {
  "Match Winner": {
    Home: number;
    Draw: number;
    Away: number;
  };
  "Both Teams Score": {
    Yes: number;
    No: number;
  };
  "Double Chance": {
    "Home/Draw": number;
    "Draw/Away": number;
    "Home/Away": number;
  };
  "Goals Over/Under": {
    "Over 1.5": number;
    "Over 2.5": number;
    "Over 3.5": number;
    "Under 1.5": number;
    "Under 2.5": number;
    "Under 3.5": number;
  };
  [key: string]: any; // For additional markets
}

export interface FixtureInfo {
  fixture_id: string;
  home_team: string;
  away_team: string;
  home_team_logo?: string;
  away_team_logo?: string;
  league_name?: string;
  date?: string;
  analysis_timestamp: string;
}

export interface ExpectedGoals {
  home: number;
  away: number;
}

export interface PlotSeries {
  name: string;
  data: number[];
}

export interface PlotData {
  categories: string[];
  series: PlotSeries[];
}

export interface ExpectedGoalsComparison {
  home_team: string;
  away_team: string;
  home_expected: number;
  away_expected: number;
}

export interface ComprehensivePlottingData {
  match_outcome_chart: PlotData;
  goals_markets_chart: PlotData;
  btts_chart: PlotData;
  double_chance_chart: PlotData;
  expected_goals_comparison: ExpectedGoalsComparison;
}

export interface MatchAnalysisData {
  fixture_info: FixtureInfo;
  expected_goals: ExpectedGoals;
  match_outcome_probabilities: {
    [model: string]: {
      home_win: number;
      draw: number;
      away_win: number;
      over_2_5_goals: number;
      both_teams_score: number;
    };
  };
  all_market_probabilities: {
    [model: string]: {
      [market: string]: {
        [selection: string]: number;
      };
    };
  };
  plotting_data: {
    match_outcome_chart: PlotData;
    goals_markets_chart: PlotData;
    btts_chart: PlotData;
    double_chance_chart: PlotData;
    expected_goals_comparison: {
      home_team: string;
      away_team: string;
      home_expected: number;
      away_expected: number;
    };
  };
}

// Enhanced match interface with alpha analysis data
export interface AlphaAnalysis {
  expectedGoals: {
    home: number;
    away: number;
  };
  matchOutcomeChart: {
    categories: string[];
    series: {
      name: string;
      data: number[];
    }[];
  };
  modelComparison?: {
    monte_carlo: {
      home: number;
      draw: number;
      away: number;
    };
    xgboost: {
      home: number;
      draw: number;
      away: number;
    };
    neural_network: {
      home: number;
      draw: number;
      away: number;
    };
  };
}

export interface MatchWithAnalysis extends Match {
  analysisData: MatchAnalysisData;
}

export interface UserStake {
    _id: string;
    userAddress: string;
    match: { 
        _id: string;
        teamA: Team;
        teamB: Team;
    };
    prediction: string; // e.g., "Manchester City Win"
    poolType: 'Market' | 'Alpha';
    amountStaked: number;
    amountReturned: number;
    status: 'WON' | 'LOST' | 'PENDING';
    stakeTime: string; // ISO Date String
}

// Represents a single entry on the leaderboard
export interface LeaderboardEntry {
    userAddress: string;
    netProfit: number;
    winRate: number;
    totalStakes?: number;
    totalWagered?: number;
}