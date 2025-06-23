import { type NextPage } from "next";
import Link from "next/link";
import { useAccount } from "wagmi";
import useSWR from 'swr';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StatsSummaryCard } from "@/components/features/StatsSummaryCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type UserStake } from "@/types";
import { Compass } from 'lucide-react';
import { StakeHistoryCard } from "@/components/features/StakeHistoryCard";
import { useParlayState } from "@/hooks/use-parlay-state";
import { Rocket, History, TrendingUp, TrendingDown } from "lucide-react";

const fetcher = async (url: string): Promise<UserStake[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    const info = await res.json();
    (error as any).info = info;
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
};

const StakesPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  
  // Use the centralized parlay state hook
  const { 
    parlaySelections, 
    handleSelectBet,
    handleRemoveParlayItem, 
    handleClearParlay, 
    handlePlaceParlayBet 
  } = useParlayState();

  const { data: stakes, error, isLoading } = useSWR<UserStake[]>(
    isConnected ? `/api/stakes/${address}` : null,
    fetcher
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-lg mx-auto p-8 bg-[#111] rounded-2xl shadow-lg border border-gray-800">
            <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8">
              To view your personal staking dashboard, track performance, and manage your stakes, please connect your wallet first.
            </p>
            {/* The ConnectButton from RainbowKit will be rendered in the Header */}
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#141414] text-white flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-5xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            My Dashboard
          </h1>
          <p className="text-gray-400 text-lg">
            Your personal staking performance and history.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 space-y-8 lg:sticky top-28">
            <StatsSummaryCard stakes={stakes} isLoading={isLoading} />
            <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700">
              <CardContent className="p-6">
                <h3 className="font-bold mb-4 text-white flex items-center gap-2"><Compass size={20} /> Ready for More?</h3>
                <p className="text-gray-400 mb-6 text-sm">
                  Explore new matches and put your strategy to the test.
                </p>
                <Button asChild className="w-full bg-white text-black font-bold hover:bg-gray-200 transition-transform hover:scale-105">
                  <Link href="/">Explore Matches</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <History size={24} />
                        Stake History
                    </h2>
                    {stakes && stakes.length > 5 && (
                        <Button variant="outline" className="border-gray-700 bg-gray-800/60 hover:bg-gray-800">
                            View All
                        </Button>
                    )}
                </div>
                {isLoading && <p className="text-gray-400">Loading your stakes...</p>}
                {error && <p className="text-red-400">Failed to load stakes.</p>}
                {stakes && stakes.length > 0 && (
                    <div className="space-y-4">
                        {stakes.slice(0, 5).map(stake => (
                            <StakeHistoryCard key={stake._id} stake={stake} />
                        ))}
                    </div>
                )}
                {stakes && stakes.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                      <Rocket size={48} className="mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">No Stakes Yet</h3>
                      <p>You haven&apos;t placed any stakes yet. Start by exploring upcoming matches.</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StakesPage;