// src/components/feature/StakeHistoryCard.tsx

import { Card, CardContent } from '@/components/ui/card';
import { type UserStake } from '@/types';

export function StakeHistoryCard({ stake }: { stake: UserStake }) {
  const statusColor = stake.status === 'WON' ? 'border-green-500' : 
                      stake.status === 'LOST' ? 'border-red-500' : 
                      'border-gray-600';

  return (
    <Card className={`bg-[#181818] border-l-4 ${statusColor}`}>
        <CardContent className="p-4 grid grid-cols-4 gap-4 items-center">
            <div>
                <p className="font-bold">{stake.match.teamA} vs {stake.match.teamB}</p>
                <p className="text-xs text-gray-400">Staked on: {stake.prediction}</p>
            </div>
            <div>
                <p className="text-sm text-gray-400">Pool Type</p>
                <p className="font-bold">{stake.poolType}</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-gray-400">Amount Staked</p>
                <p className="font-mono">{stake.amountStaked.toFixed(2)} CHZ</p>
            </div>
            <div className="text-right">
                <p className="text-sm text-gray-400">Return</p>
                <p className={`font-mono font-bold ${stake.amountReturned > stake.amountStaked ? 'text-green-400' : 'text-red-400'}`}>
                    {stake.amountReturned.toFixed(2)} CHZ
                </p>
            </div>
        </CardContent>
    </Card>
  );
}