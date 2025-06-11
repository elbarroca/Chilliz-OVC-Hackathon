import { type NextPage } from "next";
import Link from "next/link";
import { useAccount } from "wagmi";
import useSWR from 'swr';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StatsSummaryCard } from "@/components/features/StatsSummaryCard";
import { StakeHistoryCard } from "@/components/features/StakeHistoryCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type UserStake } from "@/types";
import { TrendingUp, History, Compass } from 'lucide-react';
import { mockUserStakes } from "@/lib/mockData";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const StakesPage: NextPage = () => {
  const { address, isConnected } = useAccount();

  const { data: stakes, error, isLoading } = useSWR<UserStake[]>(
    isConnected ? `/api/stakes/${address}` : null,
    fetcher,
    {
      fallbackData: isConnected ? mockUserStakes : undefined, // Use mock data when connected
      revalidateOnFocus: false
    }
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
          {/* Left Column: Stats */}
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

          {/* Right Column: History */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-4 mb-6">
                <History className="text-gray-400" />
                <h2 className="text-3xl font-bold">Stake History</h2>
            </div>
            
            {isLoading && (
              <div className="space-y-4">
                {/* Skeleton Loader */}
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-[#1A1A1A] border-gray-800 animate-pulse">
                        <CardContent className="p-4 h-24"></CardContent>
                    </Card>
                ))}
              </div>
            )}
            {error && (
                <Card className="bg-red-900/20 border border-red-500/30">
                    <CardContent className="p-6 text-center">
                        <h3 className="text-xl font-bold text-red-400">Failed to load stake history</h3>
                        <p className="text-red-400/80 mt-2">There was an error fetching your data. Please try again later.</p>
                    </CardContent>
                </Card>
            )}

            {stakes && (
              stakes.length > 0 ? (
                <div className="space-y-4">
                  {stakes.map((stake) => (
                    <StakeHistoryCard key={stake._id} stake={stake} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl bg-[#111111]/50">
                  <h3 className="text-xl font-semibold text-gray-300">No Stakes Yet</h3>
                  <p className="text-gray-500 mt-2">You haven&apos;t placed any stakes. Time to make your first move!</p>
                   <Button asChild className="mt-6">
                      <Link href="/">Explore Matches</Link>
                    </Button>
                </div>
              )
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StakesPage;