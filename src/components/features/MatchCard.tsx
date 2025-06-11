import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Match } from '@/types';
import { Bot } from 'lucide-react';

export function MatchCard({ match }: { match: Match }) {
  const matchDate = new Date(match.matchTime);
  const isUpcoming = match.status === 'UPCOMING';

  const getAlphaPick = () => {
    const { winA_prob, winB_prob, draw_prob } = match.alphaPredictions;
    if (winA_prob > winB_prob && winA_prob > draw_prob) return { team: match.teamA.name, outcome: 'Win' };
    if (winB_prob > winA_prob && winB_prob > draw_prob) return { team: match.teamB.name, outcome: 'Win' };
    return { team: 'Draw', outcome: '' };
  };
  const alphaPick = getAlphaPick();

  return (
    <Link href={`/${match._id}`} className="block group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-20 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
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
          <div className="flex items-center justify-between">
            {/* Team A */}
            <div className="flex flex-col items-center gap-2 text-center w-2/5">
              <img src={match.teamA.logoUrl} alt={match.teamA.name} className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform"/>
              <span className="font-bold text-base text-white text-wrap">{match.teamA.name}</span>
            </div>
            
            <span className="text-xl font-bold text-gray-500">vs</span>

            {/* Team B */}
            <div className="flex flex-col items-center gap-2 text-center w-2/5">
              <img src={match.teamB.logoUrl} alt={match.teamB.name} className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform"/>
              <span className="font-bold text-base text-white text-wrap">{match.teamB.name}</span>
            </div>
          </div>
          
        </CardContent>
        <CardFooter className="p-4 bg-gray-900/40 mt-auto border-t border-gray-800/50">
            <div className="w-full">
                <div className="mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 text-center">
                    <p className="text-xs text-blue-300 font-mono flex items-center justify-center gap-2">
                        <Bot size={14} />
                        <span className="font-bold">Alpha Pick:</span> {alphaPick.team} {alphaPick.outcome}
                    </p>
                </div>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-purple-600/20">
                    View Pools & Stake
                </Button>
            </div>
        </CardFooter>
      </Card>
    </Link>
  );
}