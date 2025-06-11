// pages/stakes.tsx

import { type NextPage } from "next";
import { useAccount } from "wagmi";
import useSWR from 'swr'; // For advanced, real-time data fetching
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StatsSummaryCard } from "@/components/features/StatsSummaryCard";
import { StakeHistoryCard } from "@/components/features/StakeHistoryCard";
import { type UserStake } from "@/types"; // We will add UserStake to our types

// The 'fetcher' function for useSWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const StakesPage: NextPage = () => {
  const { address, isConnected } = useAccount();

  // Advanced Data Fetching: useSWR handles caching, revalidation, and loading states automatically.
  const { data: stakes, error, isLoading } = useSWR<UserStake[]>(
    isConnected ? `/api/stakes/${address}` : null, // Only fetch if the user is connected
    fetcher
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#111] flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center text-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Please Connect Your Wallet</h2>
            <p className="text-gray-400">Connect your wallet to view your personal staking history and performance.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Staking Dashboard</h1>
        
        {/* At-a-glance stats */}
        <StatsSummaryCard stakes={stakes} isLoading={isLoading} />

        {/* List of historical stakes */}
        <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Stake History</h2>
            <div className="space-y-4">
                {isLoading && <p className="text-gray-500">Loading your stake history...</p>}
                {error && <p className="text-red-500">Failed to load stake history.</p>}
                {stakes && stakes.length === 0 && (
                    <p className="text-gray-500">You haven't placed any stakes yet.</p>
                )}
                {stakes && stakes.map((stake) => (
                    <StakeHistoryCard key={stake._id} stake={stake} />
                ))}
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StakesPage;