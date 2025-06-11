import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const matchDate = new Date(match.matchTime);

  return (
    <div className="group relative">
      <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded-xl blur-lg opacity-25 group-hover:opacity-60 transition duration-1000 group-hover:duration-300"></div>
      <Card className="relative bg-gradient-to-br from-[#1A1A1A] to-[#101010] border-gray-800 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Team A */}
            <div className="flex items-center gap-4">
              <img src={match.teamA.logoUrl} alt={match.teamA.name} className="w-16 h-16"/>
              <span className="text-2xl font-bold text-white">{match.teamA.name}</span>
            </div>
            
            {/* Match Info */}
            <div className="text-center">
              <p className="text-2xl font-light text-gray-400 mb-2">VS</p>
              <time dateTime={match.matchTime} className="text-sm text-gray-300 font-mono tracking-wider">
                {matchDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </time>
              <div className="mt-3">
                <Badge variant="secondary" className="bg-red-900/80 text-red-300 border-red-700">FEATURED MATCH</Badge>
              </div>
            </div>

            {/* Team B */}
            <div className="flex items-center gap-4 justify-end">
              <span className="text-2xl font-bold text-white text-right">{match.teamB.name}</span>
              <img src={match.teamB.logoUrl} alt={match.teamB.name} className="w-16 h-16"/>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-10 py-6 text-base transition-transform duration-200 group-hover:scale-105">
              <Link href={`/${match._id}`}>View Match & Place Stake</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}