// src/components/feature/LiveOddsTicker.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Match } from '@/types';

// This interface defines the structure of our odds state
interface Odds {
  winA: number;
  draw: number;
  winB: number;
}

// This interface tracks the direction of the last change for animations
type ChangeDirection = 'up' | 'down' | 'none';
interface Changes {
    winA: ChangeDirection;
    draw: ChangeDirection;
    winB: ChangeDirection;
}

// MOCK PAYOUTS - In a real app, these would be derived from pool data
const MOCK_INITIAL_PAYOUTS = {
  market: { winA: 1.8, draw: 3.2, winB: 4.5 },
  alpha: { winA: 1.6, draw: 3.8, winB: 5.1 },
};

export function LiveOddsTicker({ match }: { match: Match }) {
  const [marketOdds, setMarketOdds] = useState<Odds>(MOCK_INITIAL_PAYOUTS.market);
  const [alphaOdds, setAlphaOdds] = useState<Odds>(MOCK_INITIAL_PAYOUTS.alpha);

  const [marketChanges, setMarketChanges] = useState<Changes>({ winA: 'none', draw: 'none', winB: 'none' });
  const [alphaChanges, setAlphaChanges] = useState<Changes>({ winA: 'none', draw: 'none', winB: 'none' });

  useEffect(() => {
    const interval = setInterval(() => {
      // Function to update a single pool's odds
      const updateOdds = (prevOdds: Odds): { nextOdds: Odds, changes: Changes } => {
        const changes: Changes = { winA: 'none', draw: 'none', winB: 'none' };
        
        const nextOdds = { ...prevOdds };

        (Object.keys(prevOdds) as Array<keyof Odds>).forEach(key => {
            const randomChange = (Math.random() - 0.45) * 0.1; // Skew slightly towards increasing
            const newOdd = Math.max(1.01, prevOdds[key] + randomChange); // Payout can't be less than 1.01
            
            if (newOdd > prevOdds[key]) changes[key] = 'up';
            else if (newOdd < prevOdds[key]) changes[key] = 'down';

            nextOdds[key] = newOdd;
        });

        return { nextOdds, changes };
      };

      // Update both pools
      const { nextOdds: nextMarketOdds, changes: newMarketChanges } = updateOdds(marketOdds);
      const { nextOdds: nextAlphaOdds, changes: newAlphaChanges } = updateOdds(alphaOdds);

      setMarketOdds(nextMarketOdds);
      setMarketChanges(newMarketChanges);
      setAlphaOdds(nextAlphaOdds);
      setAlphaChanges(newAlphaChanges);

    }, 3000); // Update every 3 seconds

    // Cleanup function to stop the interval when the component unmounts
    return () => clearInterval(interval);
  }, [marketOdds, alphaOdds]); // Rerun effect if odds change externally (for future-proofing)


  const renderOdd = (label: string, value: number, change: ChangeDirection) => {
    const colorClass = 
        change === 'up' ? 'bg-green-500/20 text-green-400' :
        change === 'down' ? 'bg-red-500/20 text-red-500' :
        'bg-gray-700/50 text-white';

    return (
        <div className="flex-1 text-center">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`font-mono text-lg font-bold p-2 rounded-md transition-all duration-300 ${colorClass}`}>
                {value.toFixed(2)}x
            </p>
        </div>
    );
  }

  return (
    <Card className="bg-[#1C1C1C] border-gray-800 animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg text-center text-gray-300">
          Live Payout Multipliers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Ticker */}
        <div>
          <p className="text-sm font-bold mb-2 text-center text-red-400">❤️ Market Pool</p>
          <div className="flex justify-between items-center gap-4">
            {renderOdd(match.teamA.name, marketOdds.winA, marketChanges.winA)}
            {renderOdd('Draw', marketOdds.draw, marketChanges.draw)}
            {renderOdd(match.teamB.name, marketOdds.winB, marketChanges.winB)}
          </div>
        </div>

        {/* Alpha Ticker */}
        <div>
          <p className="text-sm font-bold mb-2 text-center text-blue-400">🧠 Alpha Pool</p>
          <div className="flex justify-between items-center gap-4">
            {renderOdd(match.teamA.name, alphaOdds.winA, alphaChanges.winA)}
            {renderOdd('Draw', alphaOdds.draw, alphaChanges.draw)}
            {renderOdd(match.teamB.name, alphaOdds.winB, alphaChanges.winB)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}