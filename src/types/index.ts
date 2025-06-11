
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