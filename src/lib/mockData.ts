import { LeaderboardEntry, UserStake } from "@/types";

export const mockLeaderboardData: LeaderboardEntry[] = [
  {
    userAddress: "0x742d35Cc6434C0532925a3b8D5c5Aa8b1C2D3E4F",
    netProfit: 2847.32,
    winRate: 78.5,
    totalStakes: 127,
    totalWagered: 8940.50
  },
  {
    userAddress: "0x8E9F1A2B3C4D5E6F7890123456789ABCDEF01234",
    netProfit: 1924.67,
    winRate: 72.1,
    totalStakes: 89,
    totalWagered: 6250.25
  },
  {
    userAddress: "0x5678ABCDEF1234567890FEDCBA0987654321ABCD",
    netProfit: 1456.89,
    winRate: 69.3,
    totalStakes: 156,
    totalWagered: 7890.75
  },
  {
    userAddress: "0xDEADBEEF1234567890ABCDEF0123456789ABCDEF",
    netProfit: 1123.45,
    winRate: 65.8,
    totalStakes: 98,
    totalWagered: 5670.80
  },
  {
    userAddress: "0x1234567890ABCDEF1234567890ABCDEF12345678",
    netProfit: 987.21,
    winRate: 63.2,
    totalStakes: 145,
    totalWagered: 6789.90
  },
  {
    userAddress: "0xFEDCBA0987654321FEDCBA0987654321FEDCBA09",
    netProfit: 834.76,
    winRate: 61.7,
    totalStakes: 112,
    totalWagered: 4567.30
  },
  {
    userAddress: "0xABCDEF1234567890ABCDEF1234567890ABCDEF12",
    netProfit: 692.33,
    winRate: 58.9,
    totalStakes: 87,
    totalWagered: 3890.45
  },
  {
    userAddress: "0x9876543210FEDCBA9876543210FEDCBA98765432",
    netProfit: 545.12,
    winRate: 56.4,
    totalStakes: 134,
    totalWagered: 5234.60
  },
  {
    userAddress: "0x456789ABCDEF0123456789ABCDEF0123456789AB",
    netProfit: 398.87,
    winRate: 54.1,
    totalStakes: 76,
    totalWagered: 2876.20
  },
  {
    userAddress: "0x0123456789ABCDEF0123456789ABCDEF01234567",
    netProfit: 267.54,
    winRate: 52.3,
    totalStakes: 95,
    totalWagered: 3456.75
  },
  {
    userAddress: "0xBEEFCAFE1234567890DEADBEEF1234567890BEEF",
    netProfit: 156.32,
    winRate: 49.8,
    totalStakes: 68,
    totalWagered: 2134.50
  },
  {
    userAddress: "0x7890ABCDEF1234567890ABCDEF1234567890ABCD",
    netProfit: 89.45,
    winRate: 47.2,
    totalStakes: 54,
    totalWagered: 1678.90
  },
  {
    userAddress: "0x3456789ABCDEF0123456789ABCDEF0123456789",
    netProfit: 34.78,
    winRate: 45.6,
    totalStakes: 41,
    totalWagered: 1234.25
  },
  {
    userAddress: "0xCAFEBABE1234567890CAFEBABE1234567890CAFE",
    netProfit: -23.67,
    winRate: 43.1,
    totalStakes: 62,
    totalWagered: 1890.40
  },
  {
    userAddress: "0x6789ABCDEF0123456789ABCDEF0123456789ABCD",
    netProfit: -78.23,
    winRate: 40.5,
    totalStakes: 48,
    totalWagered: 1567.80
  },
  {
    userAddress: "0x2345678901234567890123456789012345678901",
    netProfit: -134.89,
    winRate: 38.2,
    totalStakes: 73,
    totalWagered: 2345.60
  },
  {
    userAddress: "0xDEADCAFE1234567890DEADCAFE1234567890DEAD",
    netProfit: -189.45,
    winRate: 35.7,
    totalStakes: 56,
    totalWagered: 1789.30
  },
  {
    userAddress: "0x8901234567890123456789012345678901234567",
    netProfit: -245.67,
    winRate: 33.4,
    totalStakes: 39,
    totalWagered: 1456.70
  },
  {
    userAddress: "0x4567890123456789012345678901234567890123",
    netProfit: -298.12,
    winRate: 31.1,
    totalStakes: 67,
    totalWagered: 2098.50
  },
  {
    userAddress: "0x0987654321098765432109876543210987654321",
    netProfit: -356.78,
    winRate: 28.9,
    totalStakes: 52,
    totalWagered: 1678.20
  }
];

export const mockUserStakes: UserStake[] = [
  {
    _id: "64a7b123c4d5e6f7890abcde",
    userAddress: "0x742d35Cc6434C0532925a3b8D5c5Aa8b1C2D3E4F",
    match: {
      _id: "64a7b456c4d5e6f7890abcef",
      teamA: {
        name: "Manchester City",
        slug: "manchester-city",
        logoUrl: "/api/placeholder/48/48"
      },
      teamB: {
        name: "Arsenal",
        slug: "arsenal",
        logoUrl: "/api/placeholder/48/48"
      }
    },
    prediction: "Manchester City Win",
    poolType: "Alpha",
    amountStaked: 150.50,
    amountReturned: 285.95,
    status: "WON",
    stakeTime: "2024-01-15T19:30:00.000Z"
  },
  {
    _id: "64a7b789c4d5e6f7890abcf0",
    userAddress: "0x742d35Cc6434C0532925a3b8D5c5Aa8b1C2D3E4F",
    match: {
      _id: "64a7b012c4d5e6f7890abcd1",
      teamA: {
        name: "Liverpool",
        slug: "liverpool",
        logoUrl: "/api/placeholder/48/48"
      },
      teamB: {
        name: "Chelsea",
        slug: "chelsea",
        logoUrl: "/api/placeholder/48/48"
      }
    },
    prediction: "Draw",
    poolType: "Market",
    amountStaked: 75.25,
    amountReturned: 0,
    status: "LOST",
    stakeTime: "2024-01-12T16:00:00.000Z"
  },
  {
    _id: "64a7b345c4d5e6f7890abcf2",
    userAddress: "0x742d35Cc6434C0532925a3b8D5c5Aa8b1C2D3E4F",
    match: {
      _id: "64a7b678c4d5e6f7890abcd3",
      teamA: {
        name: "Real Madrid",
        slug: "real-madrid",
        logoUrl: "/api/placeholder/48/48"
      },
      teamB: {
        name: "Barcelona",
        slug: "barcelona",
        logoUrl: "/api/placeholder/48/48"
      }
    },
    prediction: "Real Madrid Win",
    poolType: "Alpha",
    amountStaked: 200.00,
    amountReturned: 0,
    status: "PENDING",
    stakeTime: "2024-01-20T20:45:00.000Z"
  },
  {
    _id: "64a7b901c4d5e6f7890abcf4",
    userAddress: "0x742d35Cc6434C0532925a3b8D5c5Aa8b1C2D3E4F",
    match: {
      _id: "64a7b234c4d5e6f7890abcd5",
      teamA: {
        name: "Tottenham",
        slug: "tottenham",
        logoUrl: "/api/placeholder/48/48"
      },
      teamB: {
        name: "Newcastle",
        slug: "newcastle",
        logoUrl: "/api/placeholder/48/48"
      }
    },
    prediction: "Newcastle Win",
    poolType: "Market",
    amountStaked: 120.75,
    amountReturned: 241.50,
    status: "WON",
    stakeTime: "2024-01-08T14:30:00.000Z"
  },
  {
    _id: "64a7b567c4d5e6f7890abcf6",
    userAddress: "0x742d35Cc6434C0532925a3b8D5c5Aa8b1C2D3E4F",
    match: {
      _id: "64a7b890c4d5e6f7890abcd7",
      teamA: {
        name: "Brighton",
        slug: "brighton",
        logoUrl: "/api/placeholder/48/48"
      },
      teamB: {
        name: "Aston Villa",
        slug: "aston-villa",
        logoUrl: "/api/placeholder/48/48"
      }
    },
    prediction: "Draw",
    poolType: "Alpha",
    amountStaked: 90.00,
    amountReturned: 0,
    status: "LOST",
    stakeTime: "2024-01-05T18:15:00.000Z"
  }
]; 