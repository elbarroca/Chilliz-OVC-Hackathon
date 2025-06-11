import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Match } from '@/types';
import { Bot, Users, Heart, TrendingUp, Clock } from 'lucide-react';

export function MatchCard({ match }: { match: Match }) {
  const matchDate = new Date(match.matchTime);
  const isUpcoming = match.status === 'UPCOMING';

  const getAlphaPick = () => {
    const { winA_prob, winB_prob, draw_prob } = match.alphaPredictions;
    if (winA_prob > winB_prob && winA_prob > draw_prob) return { team: match.teamA.name, outcome: 'Win', confidence: (winA_prob * 100).toFixed(0) };
    if (winB_prob > winA_prob && winB_prob > draw_prob) return { team: match.teamB.name, outcome: 'Win', confidence: (winB_prob * 100).toFixed(0) };
    return { team: 'Draw', outcome: '', confidence: (draw_prob * 100).toFixed(0) };
  };
  const alphaPick = getAlphaPick();

  // Mock odds data - in real app this would come from API
  const mockOdds = {
    market: {
      teamA: 1.85,
      draw: 3.20,
      teamB: 4.50
    },
    alpha: {
      teamA: 1.65,
      draw: 3.80,
      teamB: 5.10
    }
  };

  return (
    <Link href={`/${match._id}`} className="block group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      <Card className="relative bg-[#1A1A1A] border-gray-800 group-hover:border-gray-700 transition-all duration-300 overflow-hidden h-full flex flex-col">
        <CardHeader className="p-4 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <time dateTime={match.matchTime} className="text-xs text-gray-400 font-mono uppercase">
              {matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' - '}
              {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </time>
            {isUpcoming ? (
              <Badge variant="secondary" className="bg-blue-900/80 text-blue-300 border-blue-700">Upcoming</Badge>
            ) : (
              <Badge variant="outline" className="text-gray-400">{match.status}</Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6 flex-grow">
          <div className="flex items-center justify-between mb-6">
            {/* Team A */}
            <div className="flex flex-col items-center gap-2 text-center w-2/5">
              <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={48} height={48} className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform"/>
              <span className="font-bold text-base text-white text-wrap">{match.teamA.name}</span>
            </div>
            
            <div className="text-center">
              <span className="text-xl font-bold text-gray-500 mb-2 block">vs</span>
              <div className="flex items-center justify-center gap-1 text-gray-400">
                <Clock size={12} />
                <span className="text-xs font-medium">
                  {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Team B */}
            <div className="flex flex-col items-center gap-2 text-center w-2/5">
              <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={48} height={48} className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform"/>
              <span className="font-bold text-base text-white text-wrap">{match.teamB.name}</span>
            </div>
          </div>

          {/* Odds Display */}
          <div className="space-y-3 mb-4">
            {/* Market Pool Odds */}
            <div className="p-3 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Heart size={12} className="text-red-400" />
                <span className="text-xs font-medium text-gray-300">Market Pool</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-gray-400">{match.teamA.name.split(' ')[0]}</div>
                  <div className="font-bold text-white">{mockOdds.market.teamA}x</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Draw</div>
                  <div className="font-bold text-white">{mockOdds.market.draw}x</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">{match.teamB.name.split(' ')[0]}</div>
                  <div className="font-bold text-white">{mockOdds.market.teamB}x</div>
                </div>
              </div>
            </div>

            {/* Alpha Pool Odds */}
            <div className="p-3 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={12} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-300">Alpha Pool</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-gray-400">{match.teamA.name.split(' ')[0]}</div>
                  <div className="font-bold text-white">{mockOdds.alpha.teamA}x</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Draw</div>
                  <div className="font-bold text-white">{mockOdds.alpha.draw}x</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">{match.teamB.name.split(' ')[0]}</div>
                  <div className="font-bold text-white">{mockOdds.alpha.teamB}x</div>
                </div>
              </div>
            </div>
          </div>
          
        </CardContent>
        
        <CardFooter className="p-4 bg-gray-900/40 mt-auto border-t border-gray-800/50">
            <div className="w-full">
                <div className="mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 text-center">
                    <p className="text-xs text-gray-300 font-mono flex items-center justify-center gap-2">
                        <Bot size={14} />
                        <span className="font-bold">Alpha Pick:</span> {alphaPick.team} {alphaPick.outcome}
                        <span className="text-gray-400">({alphaPick.confidence}%)</span>
                    </p>
                </div>
                <Button className="w-full bg-white text-black font-bold hover:bg-gray-200 transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-gray-600/20">
                    View Pools & Stake
                </Button>
            </div>
        </CardFooter>
      </Card>
    </Link>
  );
}