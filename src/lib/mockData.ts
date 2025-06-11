// src/lib/mockData.ts

import { type LeaderboardEntry, type UserStake, type Match } from '@/types';

export const mockLeaderboardData: LeaderboardEntry[] = [
  {
    userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96590c4567",
    netProfit: 2847.32,
    winRate: 78.5
  },
  {
    userAddress: "0x8ba1f109551bD432803012645Hac136c82416cc8",
    netProfit: 1923.45,
    winRate: 72.1
  },
  {
    userAddress: "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
    netProfit: 1456.78,
    winRate: 69.3
  },
  {
    userAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    netProfit: 1234.56,
    winRate: 65.8
  },
  {
    userAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    netProfit: 987.65,
    winRate: 63.2
  },
  {
    userAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    netProfit: 756.43,
    winRate: 58.9
  },
  {
    userAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    netProfit: 543.21,
    winRate: 55.4
  },
  {
    userAddress: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    netProfit: 432.10,
    winRate: 52.7
  },
  {
    userAddress: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    netProfit: 321.98,
    winRate: 49.8
  },
  {
    userAddress: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    netProfit: 234.56,
    winRate: 47.2
  }
];

export const mockUserStakes: UserStake[] = [
  {
    _id: "stake_001",
    userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96590c4567",
    match: {
      _id: "match_001",
      teamA: { name: "Manchester City", slug: "man-city", logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Manchester-City-Logo.png" },
      teamB: { name: "Liverpool", slug: "liverpool", logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Liverpool-Logo.png" }
    },
    prediction: "Manchester City Win",
    poolType: "Alpha",
    amountStaked: 250.00,
    amountReturned: 487.50,
    status: "WON",
    stakeTime: "2024-01-15T14:30:00Z"
  },
  {
    _id: "stake_002",
    userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96590c4567",
    match: {
      _id: "match_002",
      teamA: { name: "Arsenal", slug: "arsenal", logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Arsenal-Logo.png" },
      teamB: { name: "Chelsea", slug: "chelsea", logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Chelsea-Logo.png" }
    },
    prediction: "Draw",
    poolType: "Market",
    amountStaked: 150.00,
    amountReturned: 0.00,
    status: "LOST",
    stakeTime: "2024-01-12T16:45:00Z"
  },
  {
    _id: "stake_003",
    userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96590c4567",
    match: {
      _id: "match_003",
      teamA: { name: "Barcelona", slug: "barcelona", logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/FC-Barcelona-Logo.png" },
      teamB: { name: "Real Madrid", slug: "real-madrid", logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Real-Madrid-Logo.png" }
    },
    prediction: "Barcelona Win",
    poolType: "Alpha",
    amountStaked: 300.00,
    amountReturned: 540.00,
    status: "WON",
    stakeTime: "2024-01-10T19:00:00Z"
  },
  {
    _id: "stake_004",
    userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96590c4567",
    match: {
      _id: "match_004",
      teamA: { name: "PSG", slug: "psg", logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Paris-Saint-Germain-Logo.png" },
      teamB: { name: "Bayern Munich", slug: "bayern", logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Bayern-Munich-Logo.png" }
    },
    prediction: "Bayern Munich Win",
    poolType: "Market",
    amountStaked: 200.00,
    amountReturned: 380.00,
    status: "WON",
    stakeTime: "2024-01-08T20:30:00Z"
  },
  {
    _id: "stake_005",
    userAddress: "0x742d35Cc6634C0532925a3b8D4C9db96590c4567",
    match: {
      _id: "match_005",
      teamA: { name: "Juventus", slug: "juventus", logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Juventus-Logo.png" },
      teamB: { name: "AC Milan", slug: "ac-milan", logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/AC-Milan-Logo.png" }
    },
    prediction: "AC Milan Win",
    poolType: "Alpha",
    amountStaked: 175.00,
    amountReturned: 0.00,
    status: "PENDING",
    stakeTime: "2024-01-20T15:00:00Z"
  }
];

export const mockMatches: Match[] = [
  {
    _id: "match_upcoming_001",
    matchId: 1001,
    teamA: {
      name: "Manchester United",
      slug: "man-united",
      logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Manchester-United-Logo.png"
    },
    teamB: {
      name: "Tottenham",
      slug: "tottenham",
      logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Tottenham-Logo.png"
    },
    matchTime: "2024-01-25T15:30:00Z",
    league: "Premier League",
    status: "UPCOMING",
    alphaPredictions: {
      winA_prob: 0.45,
      draw_prob: 0.25,
      winB_prob: 0.30
    }
  },
  {
    _id: "match_upcoming_002",
    matchId: 1002,
    teamA: {
      name: "Inter Milan",
      slug: "inter-milan",
      logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Inter-Milan-Logo.png"
    },
    teamB: {
      name: "Napoli",
      slug: "napoli",
      logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Napoli-Logo.png"
    },
    matchTime: "2024-01-26T20:00:00Z",
    league: "Serie A",
    status: "UPCOMING",
    alphaPredictions: {
      winA_prob: 0.38,
      draw_prob: 0.28,
      winB_prob: 0.34
    }
  },
  {
    _id: "match_upcoming_003",
    matchId: 1003,
    teamA: {
      name: "Atletico Madrid",
      slug: "atletico-madrid",
      logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Atletico-Madrid-Logo.png"
    },
    teamB: {
      name: "Sevilla",
      slug: "sevilla",
      logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Sevilla-Logo.png"
    },
    matchTime: "2024-01-27T18:45:00Z",
    league: "La Liga",
    status: "UPCOMING",
    alphaPredictions: {
      winA_prob: 0.52,
      draw_prob: 0.23,
      winB_prob: 0.25
    }
  },
  {
    _id: "match_upcoming_004",
    matchId: 1004,
    teamA: {
      name: "Borussia Dortmund",
      slug: "dortmund",
      logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/Borussia-Dortmund-Logo.png"
    },
    teamB: {
      name: "RB Leipzig",
      slug: "rb-leipzig",
      logoUrl: "https://logos-world.net/wp-content/uploads/2020/06/RB-Leipzig-Logo.png"
    },
    matchTime: "2024-01-28T16:30:00Z",
    league: "Bundesliga",
    status: "UPCOMING",
    alphaPredictions: {
      winA_prob: 0.41,
      draw_prob: 0.26,
      winB_prob: 0.33
    }
  }
]; 