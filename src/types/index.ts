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
    status: 'UPCOMING' | 'LIVE' | 'ENDED';
    alphaPredictions: {
      winA_prob: number;
      draw_prob: number;
      winB_prob: number;
    };
  }

export interface UserStake {
    _id: string;
    userAddress: string;
    match: { // A simplified version of the Match object for context
        teamA: string;
        teamB: string;
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
}