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
import { useState } from "react";
import { UpcomingMatchesSelector } from "@/components/features/UpcomingMatchesSelector";
import { RecommendedMatches } from "@/components/features/RecommendedMatches";
import { type ParlaySelectionDetails } from "@/components/features/StakingInterface";
import { FloatingParlay } from "@/components/features/FloatingParlay";

const fetcher = async (url: string): Promise<UserStake[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    const info = await res.json();
    (error as any).info = info;
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
};

const StakesPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const [parlaySelections, setParlaySelections] = useState<ParlaySelectionDetails[]>([]);

  const { data: stakes, error, isLoading } = useSWR<UserStake[]>(
    isConnected ? `/api/stakes/${address}` : null,
    fetcher
  );

  const handleSelectParlay = (selection: ParlaySelectionDetails) => {
    setParlaySelections(prev => {
      // Prevent adding if match already in parlay
      if (prev.some(s => s.matchId === selection.matchId)) {
        return prev;
      }
      return [...prev, selection];
    });
  };

  const handleRemoveParlay = (matchId: string) => {
    setParlaySelections(prev => prev.filter(s => s.matchId !== matchId));
  };

  const handleClearParlay = () => {
    setParlaySelections([]);
  };

  const handlePlaceParlayBet = (amount: number) => {
    // TODO: Implement actual parlay betting logic
    console.log('Placing parlay bet for:', amount, 'CHZ with selections:', parlaySelections);
    alert(`Parlay bet of ${amount} CHZ placed! (See console for details)`);
    handleClearParlay();
  };


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
            {/* The ConnectButton will open the wallet connection modal */}
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
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
          {/* Left Column: Stats and Parlay Builder */}
          <div className="lg:col-span-1 space-y-8 sticky top-28">
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

          {/* Right Column: Recommended Matches for Parlay */}
          <div className="lg:col-span-2 space-y-8">
            <UpcomingMatchesSelector 
              onSelect={(selection) => handleSelectParlay({
                poolType: 'market',
                matchId: selection.matchId,
                matchName: selection.matchName,
                selectionName: selection.selectionName,
                selectionId: selection.selectionId,
                odds: selection.odds
              })}
              selectedMatchIds={parlaySelections.map(s => s.matchId)}
            />
            <RecommendedMatches 
              onSelectBet={handleSelectParlay}
              parlaySelections={parlaySelections}
            />
          </div>
        </div>
        <FloatingParlay
            selections={parlaySelections}
            onRemove={handleRemoveParlay}
            onClear={handleClearParlay}
            onPlaceBet={handlePlaceParlayBet}
        />
      </main>
      <Footer />
    </div>
  );
};

export default StakesPage;