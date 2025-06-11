import { type NextPage } from "next";
import Link from "next/link";
import useSWR from 'swr';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type LeaderboardEntry } from "@/types";
import { Trophy, ShieldCheck, BarChart2, TrendingUp, Users, Target, Crown, Medal, Award } from "lucide-react";
import { mockLeaderboardData } from "@/lib/mockData";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const LeaderboardPage: NextPage = () => {
  const { data: leaderboard, error, isLoading } = useSWR<LeaderboardEntry[]>('/api/leaderboard', fetcher, {
    fallbackData: mockLeaderboardData, // Use mock data as fallback
    revalidateOnFocus: false
  });

  const rankMedal = (rank: number) => {
    if (rank === 1) return <Crown className="w-8 h-8 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-300" />;
    if (rank === 3) return <Award className="w-8 h-8 text-yellow-600" />;
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border border-gray-600">
        <span className="text-gray-300 font-bold text-sm">{rank}</span>
      </div>
    );
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold">👑 Champion</Badge>;
    if (rank === 2) return <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-black font-bold">🥈 Runner-up</Badge>;
    if (rank === 3) return <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white font-bold">🥉 Third Place</Badge>;
    if (rank <= 10) return <Badge variant="outline" className="border-gray-600 text-gray-300">Top 10</Badge>;
    return null;
  };

  const LeaderboardSkeleton = () => (
    <div className="space-y-4 max-w-5xl mx-auto animate-pulse">
        {[...Array(8)].map((_, i) => (
            <Card key={i} className="bg-gradient-to-br from-gray-900/50 to-black border-gray-800">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
                            <div className="w-40 h-6 bg-gray-700 rounded-md"></div>
                        </div>
                        <div className="flex items-center gap-8">
                            <div className="w-20 h-8 bg-gray-700 rounded-md"></div>
                            <div className="w-24 h-8 bg-gray-700 rounded-md"></div>
                            <div className="w-28 h-8 bg-gray-700 rounded-md"></div>
                        </div>
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
        {/* Hero Section */}
        <div className="text-center mb-16 relative overflow-hidden rounded-2xl p-12 border border-gray-800 bg-gradient-to-br from-[#1A1A1A] to-black">
          <div className="absolute -inset-2 bg-gradient-to-r from-yellow-600 to-yellow-700 blur-2xl opacity-10"></div>
          <div className="absolute inset-0 bg-grid-white/[0.03]"></div>
          <div className="relative">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500">
              Hall of Fame
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-8">
              Celebrating the most profitable and strategic players in the AlphaStakes arena. Climb the ranks and earn your place among legends.
            </p>
            
            {/* Platform Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="p-4 bg-gradient-to-br from-gray-900/50 to-black rounded-xl border border-gray-700">
                <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">1,234</div>
                <div className="text-sm text-gray-400">Active Players</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-gray-900/50 to-black rounded-xl border border-gray-700">
                <TrendingUp className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">89.2K</div>
                <div className="text-sm text-gray-400">CHZ Wagered</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-gray-900/50 to-black rounded-xl border border-gray-700">
                <Target className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">67.3%</div>
                <div className="text-sm text-gray-400">Avg Win Rate</div>
              </div>
            </div>
          </div>
        </div>
        
        {isLoading && <LeaderboardSkeleton />}

        {error && (
            <div className="text-center py-20 bg-red-900/10 border border-red-500/20 rounded-xl max-w-5xl mx-auto">
                <h3 className="text-2xl font-bold text-red-400">Error Loading Leaderboard</h3>
                <p className="text-red-400/80 mt-2">Could not fetch leaderboard data at this time. Please try again later.</p>
            </div>
        )}

        {leaderboard && (
          <div className="space-y-4 max-w-5xl mx-auto">
            {leaderboard.length > 0 ? leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              const profitColor = entry.netProfit >= 0 ? 'text-green-400' : 'text-red-400';
              
              return (
                <div key={entry.userAddress} className="relative group">
                  {/* Gradient border effect for top 3 */}
                  {isTop3 && (
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  )}
                  
                  <Card 
                    className={`
                      relative border transition-all duration-300 hover:shadow-lg
                      ${isTop3 
                        ? 'bg-gradient-to-r from-yellow-900/20 via-gray-900 to-gray-900 border-yellow-500/30 hover:border-yellow-400/50 hover:shadow-yellow-500/10' 
                        : 'bg-gradient-to-br from-gray-900/50 to-black border-gray-800 hover:border-gray-700 hover:shadow-gray-500/5'
                      }
                    `}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        {/* Left Section: Rank & User */}
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-center gap-2">
                            {rankMedal(rank)}
                            {getRankBadge(rank)}
                          </div>
                          
                          <div>
                            <div className="font-mono text-lg text-gray-300 mb-1">
                              {entry.userAddress}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>Rank #{rank}</span>
                              <span>•</span>
                              <span>{entry.totalStakes || 0} stakes</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Section: Stats */}
                        <div className="flex items-center gap-8">
                          {/* Win Rate */}
                          <div className="text-center">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                              <ShieldCheck size={12} />
                              Win Rate
                            </div>
                            <div className="text-xl font-bold text-white">
                              {entry.winRate.toFixed(1)}%
                            </div>
                          </div>
                          
                          {/* Total Wagered */}
                          <div className="text-center">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                              <BarChart2 size={12} />
                              Wagered
                            </div>
                            <div className="text-xl font-bold text-gray-300">
                              {(entry.totalWagered || 0).toFixed(0)}
                              <span className="text-sm font-normal text-gray-500 ml-1">CHZ</span>
                            </div>
                          </div>
                          
                          {/* Net Profit */}
                          <div className="text-center min-w-[120px]">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                              <TrendingUp size={12} />
                              Net Profit
                            </div>
                            <div className={`text-xl font-bold ${profitColor}`}>
                              {entry.netProfit > 0 ? '+' : ''}{entry.netProfit.toFixed(2)}
                              <span className="text-sm font-normal text-gray-500 ml-1">CHZ</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            }) : (
                 <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl bg-[#111111]/50">
                  <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300">Leaderboard is Empty</h3>
                  <p className="text-gray-500 mt-2">No one has made a profitable stake yet. Be the first champion!</p>
                </div>
            )}
          </div>
        )}
        
        <div className="text-center mt-16">
          <Button size="lg" asChild className="bg-white text-black font-bold hover:bg-gray-200 transition-transform duration-300 transform hover:scale-105">
            <Link href="/">Start Your Journey</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LeaderboardPage;