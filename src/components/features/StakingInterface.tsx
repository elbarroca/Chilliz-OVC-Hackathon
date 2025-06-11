
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { contractAddress, contractAbi } from '@/lib/contants'; // Your contract constants
import { Match } from '@/types';

// Simplified for MVP. In a real app, these would come from on-chain reads.
const MOCK_POOL_DATA = {
  market: { total: 1500, winA: 1.8, draw: 3.2, winB: 4.5 },
  alpha: { total: 850, winA: 1.6, draw: 3.8, winB: 5.1 },
};

interface StakingPoolProps {
  poolType: 'Market' | 'Alpha';
  match: Match;
  accentColor: 'red' | 'blue';
  onStake: (poolType: 'market' | 'alpha', outcome: number, amount: string) => void;
}

function StakingPool({ poolType, match, accentColor, onStake }: StakingPoolProps) {
  const [amount, setAmount] = useState('');
  const poolData = poolType === 'Market' ? MOCK_POOL_DATA.market : MOCK_POOL_DATA.alpha;
  const colorClass = accentColor === 'red' ? 'border-red-500/50' : 'border-blue-500/50';

  return (
    <Card className={`bg-[#181818] ${colorClass}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {poolType === 'Market' ? '❤️' : '🧠'} The {poolType} Pool
        </CardTitle>
        <p className="font-mono text-sm text-gray-400">Total Staked: {poolData.total} CHZ</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* We map outcomes for staking buttons */}
        {[
          { name: match.teamA.name, payout: poolData.winA, outcomeId: 0 },
          { name: 'Draw', payout: poolData.draw, outcomeId: 1 },
          { name: match.teamB.name, payout: poolData.winB, outcomeId: 2 },
        ].map(({ name, payout, outcomeId }) => (
          <div key={name} className="flex justify-between items-center bg-gray-800/50 p-3 rounded-md">
            <span className="font-bold text-white">{name}</span>
            <span className="font-mono text-green-400">{payout}x Payout</span>
          </div>
        ))}
        <div className="flex gap-2 pt-4">
            <Input 
              type="number"
              placeholder="0.0 CHZ"
              className="bg-gray-900 border-gray-700 text-white font-mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button 
              className={`bg-${accentColor}-600 hover:bg-${accentColor}-500 text-white w-full`}
              onClick={() => onStake(poolType.toLowerCase() as 'market'|'alpha', 0, amount)} // Simplified outcomeId
            >
              Stake
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StakingInterface({ match }: { match: Match }) {
  const { address } = useAccount();
  const { writeContract, error } = useWriteContract();

  const handleStake = (poolType: 'market' | 'alpha', outcome: number, amount: string) => {
    if (!address || !amount || parseFloat(amount) <= 0) {
        alert("Please connect wallet and enter a valid amount.");
        return;
    }
    
    writeContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'stake',
        args: [
            match.matchId,
            outcome,
            poolType === 'alpha', // isAlphaPool boolean
        ],
        value: parseEther(amount),
    });

    if (error) {
        console.error("Stake failed:", error.message);
        alert(`Stake failed: ${error.message}`);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 mt-8">
      <StakingPool poolType="Market" match={match} accentColor="red" onStake={handleStake} />
      <StakingPool poolType="Alpha" match={match} accentColor="blue" onStake={handleStake} />
    </div>
  );
}