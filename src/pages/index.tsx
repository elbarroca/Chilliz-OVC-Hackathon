import { type GetServerSideProps, type NextPage } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MatchCard } from "@/components/features/MatchCard";
import { Button } from "@/components/ui/button";
import { FeaturedMatch } from "@/components/features/FeaturedMatch";
import { type Match } from "@/types";
import { ArrowRight, BrainCircuit, Users, Lock, TrendingUp, Clock } from "lucide-react";
import { mockMatches, mockUserStakes } from "@/lib/mockData";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// This server-side function fetches your match data before the page loads.
export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = context.req.headers.host;
    const apiUrl = `${protocol}://${host}`;

    const res = await fetch(`${apiUrl}/api/matches`);
    if (!res.ok) throw new Error(`Failed to fetch matches. Status: ${res.status}`);
    
    const matches: Match[] = await res.json();
    return { props: { matches: matches.length > 0 ? matches : mockMatches } }; // Use mock data as fallback
  } catch (error) {
    console.error(error);
    return { props: { matches: mockMatches } }; // Use mock data on error
  }
};

const MyMatchesWidget = () => {
  const { isConnected } = useAccount();
  
  if (!isConnected) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-300">
            <TrendingUp size={20} />
            My Active Stakes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-gray-400 mb-4">Connect your wallet to view your active stakes</p>
          <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
            Connect Wallet
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activeStakes = mockUserStakes.filter(stake => stake.status === 'PENDING').slice(0, 3);

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-300">
          <TrendingUp size={20} />
          My Active Stakes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeStakes.length > 0 ? (
          <div className="space-y-3">
            {activeStakes.map((stake) => (
              <Link key={stake._id} href={`/${stake.match._id}`} className="block group">
                <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50 group-hover:border-purple-500/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <img src={stake.match.teamA.logoUrl} alt={stake.match.teamA.name} className="w-6 h-6" />
                        <span className="text-xs text-gray-400">vs</span>
                        <img src={stake.match.teamB.logoUrl} alt={stake.match.teamB.name} className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{stake.prediction}</p>
                        <p className="text-xs text-gray-400">{stake.poolType} Pool</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-purple-300">{stake.amountStaked} CHZ</p>
                      <div className="flex items-center gap-1 text-xs text-yellow-400">
                        <Clock size={10} />
                        Pending
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            <Link href="/stakes">
              <Button variant="outline" className="w-full mt-4 border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                View All Stakes
              </Button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">No active stakes</p>
            <Link href="#matches">
              <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10">
                Explore Matches
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LandingPage: NextPage<{ matches: Match[] }> = ({ matches }) => {
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

        {/* My Matches Widget Section */}
        <section className="py-16 bg-black">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto">
              <MyMatchesWidget />
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

        {/* How It Works Section */}
        <section className="py-20 md:py-24 bg-black">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-white">How It Works</h2>
                    <p className="text-lg text-gray-400 mt-4 max-w-2xl mx-auto">A simple, transparent, and secure process to get you in the game.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                           <span className="text-2xl font-bold">1</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h3>
                        <p className="text-gray-400">Securely connect your wallet to interact with the Chiliz Chain and manage your funds.</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                            <span className="text-2xl font-bold">2</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Explore Matches</h3>
                        <p className="text-gray-400">Browse upcoming matches and analyze the odds. Choose between the community Market Pool or our AI Alpha Pool.</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                            <span className="text-2xl font-bold">3</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Place Your Stake</h3>
                        <p className="text-gray-400">Commit your $CHZ to the pool of your choice and get ready to watch the action unfold.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Why AlphaStakes Section */}
        <section className="py-20 md:py-24 bg-[#0A0A0A] border-y border-gray-900">
            <div className="container mx-auto px-4">
                 <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-white">Why AlphaStakes?</h2>
                    <p className="text-lg text-gray-400 mt-4 max-w-2xl mx-auto">An ecosystem designed for transparency, choice, and strategic advantage.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <div className="p-8 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-gray-800">
                        <BrainCircuit className="w-10 h-10 mb-4 text-blue-400" />
                        <h3 className="text-xl font-bold text-white mb-2">Dual-Pool System</h3>
                        <p className="text-gray-400">Choose your strategy. Follow the community sentiment in the Market Pool or leverage our proprietary AI model in the Alpha Pool for data-driven predictions.</p>
                    </div>
                    <div className="p-8 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-gray-800">
                        <Users className="w-10 h-10 mb-4 text-purple-400" />
                        <h3 className="text-xl font-bold text-white mb-2">Community Driven</h3>
                        <p className="text-gray-400">AlphaStakes is more than a platform; it's a community. Engage with fellow sports fans, share insights, and compete for the top spot on our leaderboards.</p>
                    </div>
                    <div className="p-8 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-gray-800">
                        <Lock className="w-10 h-10 mb-4 text-green-400" />
                        <h3 className="text-xl font-bold text-white mb-2">Secure & Transparent</h3>
                        <p className="text-gray-400">Built on the secure and scalable Chiliz Chain. All transactions are on-chain, ensuring complete transparency and fairness for all participants.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Featured Match Section */}
        {matches.length > 0 && (
          <section id="matches" className="py-20 md:py-24 bg-black">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold">Featured Match</h2>
              </div>
              <FeaturedMatch match={matches[0]} />
            </div>
          </section>
        )}

        {/* Other Matches */}
        {matches.length > 1 && (
          <section className="py-16 bg-[#101010]">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold">Upcoming Matches</h2>
                <p className="text-gray-400 max-w-2xl mx-auto mt-2">
                  Choose your side: Follow the crowd with Market pools or trust our AI-powered Alpha Engine predictions.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {matches.slice(1).map((match) => (
                  <MatchCard key={match._id} match={match} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* No Matches Fallback */}
        {matches.length === 0 && (
          <section id="matches" className="py-32 text-center bg-black">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl text-gray-500">No Upcoming Matches</h2>
              <p className="text-gray-600">Please check back later for new opportunities.</p>
            </div>
          </section>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default LandingPage;