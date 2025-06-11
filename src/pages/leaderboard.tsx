import { type NextPage } from "next";
import Link from "next/link";
import useSWR from 'swr';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type LeaderboardEntry } from "@/types";
import { Trophy, ShieldCheck, BarChart2 } from "lucide-react";
import { mockLeaderboardData } from "@/lib/mockData";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const LeaderboardPage: NextPage = () => {
  const { data: leaderboard, error, isLoading } = useSWR<LeaderboardEntry[]>('/api/leaderboard', fetcher, {
    fallbackData: mockLeaderboardData, // Use mock data as fallback
    revalidateOnFocus: false
  });

  const rankMedal = (rank: number) => {
    if (rank === 1) return <Trophy className="w-8 h-8 text-yellow-400" />;
    if (rank === 2) return <Trophy className="w-8 h-8 text-gray-300" />;
    if (rank === 3) return <Trophy className="w-8 h-8 text-yellow-600" />;
    return <span className="text-gray-500 font-bold text-lg">{rank}</span>;
  };

  const LeaderboardSkeleton = () => (
    <div className="space-y-4 max-w-4xl mx-auto animate-pulse">
        {[...Array(5)].map((_, i) => (
            <Card key={i} className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-8 bg-gray-700 rounded-md"></div>
                        <div className="w-32 h-6 bg-gray-700 rounded-md"></div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-10 bg-gray-700 rounded-md"></div>
                        <div className="w-24 h-10 bg-gray-700 rounded-md"></div>
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500">
            Hall of Fame
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Celebrating the most profitable and strategic players in the AlphaStakes arena.
          </p>
        </div>
        
        {isLoading && <LeaderboardSkeleton />}

        {error && (
            <div className="text-center py-20 bg-red-900/10 border border-red-500/20 rounded-xl max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold text-red-400">Error Loading Leaderboard</h3>
                <p className="text-red-400/80 mt-2">Could not fetch leaderboard data at this time. Please try again later.</p>
            </div>
        )}

        {leaderboard && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {leaderboard.length > 0 ? leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              const profitColor = entry.netProfit >= 0 ? 'text-green-400' : 'text-red-400';
              
              return (
                <Card 
                  key={entry.userAddress} 
                  className={`
                    border
                    ${isTop3 ? 'bg-gradient-to-r from-yellow-900/20 via-gray-900 to-gray-900 border-yellow-500/30' : 'bg-gray-900/50 border-gray-800'}
                    transition-all duration-300 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-500/5
                  `}
                >
                  <CardContent className="p-4 grid grid-cols-6 gap-4 items-center">
                    <div className="col-span-1 text-center flex justify-center items-center">
                      {rankMedal(rank)}
                    </div>
                    <div className="col-span-2 font-mono text-base text-gray-300">
                      {entry.userAddress}
                    </div>
                    <div className="col-span-1 text-center">
                        <div className="text-xs text-gray-400 flex items-center justify-center gap-1.5"><ShieldCheck size={12} /> Win Rate</div>
                        <div className="text-lg font-bold text-blue-400">{entry.winRate.toFixed(1)}%</div>
                    </div>
                     <div className="col-span-2 text-right">
                        <div className="text-xs text-gray-400 flex items-center justify-end gap-1.5"><BarChart2 size={12} /> Net Profit</div>
                        <div className={`text-lg font-bold ${profitColor}`}>
                          {entry.netProfit > 0 ? '+' : ''}{entry.netProfit.toFixed(2)}
                          <span className="text-sm font-normal text-gray-500 ml-1">CHZ</span>
                        </div>
                      </div>
                  </CardContent>
                </Card>
              );
            }) : (
                 <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl bg-[#111111]/50">
                  <h3 className="text-xl font-semibold text-gray-300">Leaderboard is Empty</h3>
                  <p className="text-gray-500 mt-2">No one has made a profitable stake yet. Be the first!</p>
                </div>
            )}
          </div>
        )}
        
        <div className="text-center mt-16">
          <Button size="lg" asChild className="bg-white text-black font-bold hover:bg-gray-200 transition-transform duration-300 transform hover:scale-105">
            <Link href="/">Back to Matches</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LeaderboardPage;