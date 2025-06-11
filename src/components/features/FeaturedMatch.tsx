
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type Match } from '@/types';

// Mock data for visualization. In a real app, this would come from on-chain reads.
const mockPoolState = {
  market: { total: 1500, onTeamA: 1000, onDraw: 200, onTeamB: 300 },
  alpha: { total: 850, onTeamA: 600, onDraw: 150, onTeamB: 100 },
};

// A simple progress bar component for visualization
function PoolProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-2.5">
      <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
  );
}

export function FeaturedMatch({ match }: { match: Match }) {
  const marketTeamAPercentage = (mockPoolState.market.onTeamA / mockPoolState.market.total) * 100;
  const alphaTeamAPercentage = (mockPoolState.alpha.onTeamA / mockPoolState.alpha.total) * 100;

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
      <Card className="bg-gradient-to-br from-[#1c1c1c] to-[#111] border-gray-800">
        <CardHeader className="text-center">
          <p className="text-sm font-semibold text-blue-400">FEATURED MATCH</p>
          <CardTitle className="text-3xl flex items-center justify-center gap-4">
            <img src={match.teamA.logoUrl} alt="" className="w-10 h-10" />
            {match.teamA.name} vs {match.teamB.name}
            <img src={match.teamB.logoUrl} alt="" className="w-10 h-10" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 mt-4">
          {/* Market Pool Visualization */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold flex items-center gap-2">❤️ Market Sentiment</span>
              <span className="font-mono text-sm text-gray-400">{mockPoolState.market.total} CHZ Staked</span>
            </div>
            <PoolProgressBar value={marketTeamAPercentage} colorClass="bg-red-500" />
            <p className="text-xs text-gray-500 mt-1 text-center">
              Market favors {marketTeamAPercentage > 50 ? match.teamA.name : match.teamB.name}
            </p>
          </div>

          {/* Alpha Pool Visualization */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-bold flex items-center gap-2">🧠 Alpha Engine</span>
              <span className="font-mono text-sm text-gray-400">{mockPoolState.alpha.total} CHZ Staked</span>
            </div>
            <PoolProgressBar value={alphaTeamAPercentage} colorClass="bg-blue-500" />
             <p className="text-xs text-gray-500 mt-1 text-center">
              Alpha favors {alphaTeamAPercentage > 50 ? match.teamA.name : match.teamB.name}
            </p>
          </div>

          <div className="text-center pt-4">
            <Button size="lg" asChild className="bg-white text-black font-bold hover:bg-gray-200">
                <Link href={`/match/${match._id}`}>View Pools & Stake</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}