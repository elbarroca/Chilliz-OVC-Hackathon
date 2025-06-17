import { useState, useEffect, type FC } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MatchCard } from "@/components/features/MatchCard";
import { Button } from "@/components/ui/button";
import { FeaturedMatch } from "@/components/features/FeaturedMatch";
import { type Match } from "@/types";
import { ArrowRight, BrainCircuit, Users, Lock, TrendingUp, Clock, AlertTriangle, Calendar as CalendarIcon } from "lucide-react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MyMatchesWidget = () => {
  const { isConnected } = useAccount();
  
  if (!isConnected) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-300">
            <TrendingUp size={20} />
            My Active Stakes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-gray-400 mb-4">Connect your wallet to view your active stakes</p>
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-300">
          <TrendingUp size={20} />
          My Active Stakes
        </CardTitle>
      </CardHeader>
      <CardContent>
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">No active stakes found.</p>
            <Link href="#matches">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
                Explore Matches
              </Button>
            </Link>
          </div>
      </CardContent>
    </Card>
  );
};

// Helper to format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const LandingPage: FC = () => {
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [pastMatches, setPastMatches] = useState<Match[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingPast, setLoadingPast] = useState(true);
  
  // Default to yesterday
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday);
  });

  // Fetch upcoming matches on mount
  useEffect(() => {
    const fetchUpcoming = async () => {
      setLoadingUpcoming(true);
      try {
        const res = await fetch('/api/matches');
        if (res.ok) {
          const data = await res.json();
          setUpcomingMatches(data);
        }
      } catch (error) {
        console.error("Failed to fetch upcoming matches:", error);
      }
      setLoadingUpcoming(false);
    };
    fetchUpcoming();
  }, []);

  // Fetch past matches when selectedDate changes
  useEffect(() => {
    const fetchPastMatches = async () => {
      if (!selectedDate) return;
      setLoadingPast(true);
      try {
        const res = await fetch(`/api/matches?type=past&date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setPastMatches(data);
        }
      } catch (error) {
        console.error("Failed to fetch past matches:", error);
      }
      setLoadingPast(false);
    };
    fetchPastMatches();
  }, [selectedDate]);


  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative text-center py-20 md:py-32 overflow-hidden border-b border-gray-900">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
          <div 
            className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(to_bottom,white_10%,transparent_90%)]"
          ></div>
          <div className="container mx-auto px-4 relative">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
              Heart vs. Mind. <span className="block">Your Call.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 mb-8">
              The premier prediction market where fan passion meets data-driven strategy. Stake with the community or back our quantitative Alpha Engine.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-black font-bold hover:bg-gray-200 transform hover:scale-105 transition-transform duration-300">
                <Link href="#matches">Explore Matches</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-gray-700 bg-black/30 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-300">
                <Link href="/leaderboard">View Leaderboard</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Introduction Section */}
        <section className="py-20 md:py-24 bg-[#0A0A0A]">
            <div className="container mx-auto px-4 text-center max-w-4xl">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-white mb-6">
                    Where Data Meets Passion
                </h2>
                <p className="text-lg text-gray-400 leading-relaxed">
                    AlphaStakes is a decentralized prediction market built on the Chiliz Chain, the home of sports and entertainment. We bridge the gap between emotional sports betting and analytical, data-driven predictions. By offering two distinct staking pools—the community-driven Market Pool and the AI-powered Alpha Pool—we provide a comprehensive platform for every type of fan. Whether you trust your gut or the numbers, AlphaStakes is your arena to prove your insight.
                </p>
            </div>
        </section>

        {/* My Matches Widget Section */}
        <section className="py-16 bg-black">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <MyMatchesWidget />
            </div>
          </div>
        </section>

        {/* How It Works & Why AlphaStakes Combined Section */}
        <section className="py-20 md:py-32 bg-[#0A0A0A]">
            <div className="container mx-auto px-4">
                {/* How It Works */}
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-white mb-4">How It Works</h2>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-16">A simple, transparent, and secure process to get you in the game.</p>
                    
                    <div className="grid md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto mb-20">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 text-white border border-gray-600">
                               <span className="text-2xl font-bold">1</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                            <p className="text-gray-400">Securely connect your wallet to interact with the Chiliz Chain and manage your funds.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 text-white border border-gray-600">
                                <span className="text-2xl font-bold">2</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Explore Matches</h3>
                            <p className="text-gray-400">Browse upcoming matches and analyze the odds. Choose between the community Market Pool or our AI Alpha Pool.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 text-white border border-gray-600">
                                <span className="text-2xl font-bold">3</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Place Your Stake</h3>
                            <p className="text-gray-400">Commit your $CHZ to the pool of your choice and get ready to watch the action unfold.</p>
                        </div>
                    </div>
                </div>

                {/* Why AlphaStakes */}
                <div className="text-center">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-white mb-4">Why AlphaStakes?</h2>
                    <p className="text-lg text-gray-400 mb-16 max-w-2xl mx-auto">An ecosystem designed for transparency, choice, and strategic advantage.</p>
                    
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <div className="p-8 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-gray-700 hover:border-gray-600 transition-colors">
                            <BrainCircuit className="w-10 h-10 mb-4 text-gray-300 mx-auto" />
                            <h3 className="text-xl font-bold text-white mb-2">Dual-Pool System</h3>
                            <p className="text-gray-400">Choose your strategy. Follow the community sentiment in the Market Pool or leverage our proprietary AI model in the Alpha Pool for data-driven predictions.</p>
                        </div>
                        <div className="p-8 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-gray-700 hover:border-gray-600 transition-colors">
                            <Users className="w-10 h-10 mb-4 text-gray-300 mx-auto" />
                            <h3 className="text-xl font-bold text-white mb-2">Community Driven</h3>
                            <p className="text-gray-400">AlphaStakes is more than a platform; it&apos;s a community. Engage with fellow sports fans, share insights, and compete for the top spot on our leaderboards.</p>
                        </div>
                        <div className="p-8 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-gray-700 hover:border-gray-600 transition-colors">
                            <Lock className="w-10 h-10 mb-4 text-gray-300 mx-auto" />
                            <h3 className="text-xl font-bold text-white mb-2">Secure & Transparent</h3>
                            <p className="text-gray-400">Built on the secure and scalable Chiliz Chain. All transactions are on-chain, ensuring complete transparency and fairness for all participants.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Upcoming Match Display Section */}
        <section id="matches" className="py-20 md:py-24 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Upcoming Matches</h2>
              <p className="text-gray-400 max-w-2xl mx-auto mt-2">
                Choose your side: Follow the crowd with Market pools or trust our AI-powered Alpha Engine predictions.
              </p>
            </div>
            {loadingUpcoming ? (
              <div className="text-center text-gray-400">Loading upcoming matches...</div>
            ) : upcomingMatches.length > 0 ? (
              <>
                <div className="mb-16">
                  <FeaturedMatch match={upcomingMatches[0]} />
                </div>
                
                {upcomingMatches.length > 1 && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {upcomingMatches.slice(1).map((match) => (
                      <MatchCard key={match._id} match={match} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center max-w-md mx-auto bg-gray-900/50 border border-yellow-700/50 rounded-lg p-8">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Matches Available</h3>
                <p className="text-gray-400">
                  There are no matches scheduled for today. Please check back later.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Past Results Section */}
        <section id="past-results" className="py-20 md:py-24 bg-[#0A0A0A]">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Past Results</h2>
              <p className="text-gray-400 max-w-2xl mx-auto mt-2">
                Review the outcomes and Alpha Engine performance for previous matches.
              </p>
            </div>

            <div className="flex justify-center mb-8">
              <div className="relative w-full max-w-xs">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-gray-900 border-gray-700 pl-10 text-white w-full"
                  />
              </div>
            </div>

            {loadingPast ? (
              <div className="text-center text-gray-400">Loading past results...</div>
            ) : pastMatches.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pastMatches.map((match) => (
                  <MatchCard key={match._id} match={match} />
                ))}
              </div>
            ) : (
              <div className="text-center max-w-md mx-auto bg-gray-900/50 border border-gray-700/50 rounded-lg p-8">
                <AlertTriangle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Results Found</h3>
                <p className="text-gray-400">
                  No matches with predictions were found for the selected date.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;