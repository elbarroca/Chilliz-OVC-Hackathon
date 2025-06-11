
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Match } from '@/types';

export function MatchCard({ match }: { match: Match }) {
  const matchDate = new Date(match.matchTime).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="bg-[#181818] border-gray-800 hover:border-blue-500 transition-all">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
            <img src={match.teamA.logoUrl} alt={match.teamA.name} className="w-8 h-8"/>
            <span className="font-bold text-lg text-white">{match.teamA.name}</span>
        </div>
        <span className="text-gray-400">vs</span>
        <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-white">{match.teamB.name}</span>
            <img src={match.teamB.logoUrl} alt={match.teamB.name} className="w-8 h-8"/>
        </div>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-gray-400 font-mono">{matchDate}</p>
        <div className="mt-4 p-2 bg-blue-900/50 rounded-lg border border-blue-500/50">
            <p className="text-sm text-blue-300 font-mono">
                🤖 Alpha Pick: {match.alphaPredictions.winA_prob > match.alphaPredictions.winB_prob ? match.teamA.name : match.teamB.name} Win
            </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold">
          <Link href={`/match/${match._id}`}>View Pools & Stake</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}