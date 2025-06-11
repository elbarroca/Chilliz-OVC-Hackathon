// src/components/feature/StakeHistoryCard.tsx

import { Card, CardContent } from '@/components/ui/card';
import { type UserStake } from '@/types';
import { Badge } from '../ui/badge';
import Link from 'next/link';

export function StakeHistoryCard({ stake }: { stake: UserStake }) {
  const isWin = stake.status === 'WON';
  const isLost = stake.status === 'LOST';
  const isPending = !isWin && !isLost;

  const statusMap = {
    WON: { text: 'Won', color: 'bg-green-900/80 text-green-300 border-green-700' },
    LOST: { text: 'Lost', color: 'bg-red-900/80 text-red-300 border-red-700' },
    PENDING: { text: 'Pending', color: 'bg-yellow-900/80 text-yellow-300 border-yellow-700' }
  };

  const status = isWin ? statusMap.WON : isLost ? statusMap.LOST : statusMap.PENDING;
  
  return (
    <Link href={`/${stake.match._id}`} className="block group">
      <Card className="bg-gray-900/50 border-gray-800 hover:border-blue-500 transition-colors duration-300 group-hover:bg-gray-900">
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
              <div className="col-span-2 md:col-span-2">
                  <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{stake.match.teamA.name} vs {stake.match.teamB.name}</p>
                  <p className="text-xs text-gray-400">
                    Staked on <span className="font-semibold text-gray-300">{stake.prediction}</span> in the <span className="font-semibold text-gray-300">{stake.poolType} Pool</span>
                  </p>
              </div>
              <div className="text-center">
                  <p className="text-sm text-gray-400">Staked</p>
                  <p className="font-mono text-white">{stake.amountStaked.toFixed(2)} CHZ</p>
              </div>
              <div className="text-center">
                  <p className="text-sm text-gray-400">Return</p>
                  <p className={`font-mono font-bold ${isWin ? 'text-green-400' : isLost ? 'text-red-400' : 'text-gray-400'}`}>
                      {stake.amountReturned.toFixed(2)} CHZ
                  </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className={status.color}>{status.text}</Badge>
              </div>
          </CardContent>
      </Card>
    </Link>
  );
}