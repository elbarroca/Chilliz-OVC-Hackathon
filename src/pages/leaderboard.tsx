
import { type NextPage } from "next";
import useSWR from 'swr';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { type LeaderboardEntry } from "@/types";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const LeaderboardPage: NextPage = () => {
  const { data: leaderboard, error, isLoading } = useSWR<LeaderboardEntry[]>('/api/leaderboard', fetcher);

  const rankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-yellow-600';
    return 'text-gray-500';
  };

  return (
    <div className="min-h-screen bg-[#111] flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Top Stakers</h1>
        <div className="max-w-4xl mx-auto bg-[#1C1C1C] rounded-lg border border-gray-800 p-4">
          <div className="grid grid-cols-4 text-xs text-gray-400 uppercase font-bold p-4 border-b border-gray-700">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Win Rate</span>
            <span className="text-right">Net Profit (CHZ)</span>
          </div>
          <div className="space-y-2 mt-2">
            {isLoading && <p className="p-4 text-center">Loading leaderboard...</p>}
            {leaderboard && leaderboard.map((entry, index) => (
                <div key={entry.userAddress} className="grid grid-cols-4 items-center p-4 rounded-md hover:bg-gray-800/50">
                    <span className={`text-xl font-bold ${rankColor(index + 1)}`}>#{index + 1}</span>
                    <span className="font-mono truncate">{entry.userAddress}</span>
                    <span className="text-right font-mono">{entry.winRate.toFixed(1)}%</span>
                    <span className="text-right font-mono text-green-400 font-bold">
                        {entry.netProfit.toFixed(2)}
                    </span>
                </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LeaderboardPage;