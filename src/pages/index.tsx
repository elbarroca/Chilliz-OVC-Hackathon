
import { type GetServerSideProps, type NextPage } from "next";
import { Header } from "@/components/layout/Header";
import { MatchCard } from "@/components/features/MatchCard";
import { Button } from "@/components/ui/button";
import { FeaturedMatch } from "@/components/features/FeaturedMatch";
import { type Match } from "@/types";

// This server-side function fetches your match data before the page loads.
export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/api/matches`);
    if (!res.ok) throw new Error("Failed to fetch matches");
    
    const matches: Match[] = await res.json();
    return { props: { matches } };
  } catch (error) {
    console.error(error);
    return { props: { matches: [] } }; // Gracefully handle errors
  }
};

const LandingPage: NextPage<{ matches: Match[] }> = ({ matches }) => {
  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <Header />
      <main className="container mx-auto px-4">
        
        {/* Hero Section */}
        <section className="text-center py-20 md:py-32" style={{ animation: `fade-in 0.8s ease-in-out` }}>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4" style={{ animation: `fade-in-up 0.6s ease-out 0.2s backwards` }}>
            Heart vs. Mind.
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-blue-500 to-blue-600"> Your Call.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 mb-8" style={{ animation: `fade-in-up 0.6s ease-out 0.4s backwards` }}>
            AlphaStakes is the first prediction market where fan passion collides with cold, hard data. Stake with the community or back our quantitative Alpha Engine. Prove your strategy.
          </p>
          <div style={{ animation: `fade-in-up 0.6s ease-out 0.6s backwards` }}>
            <a href="#matches">
              <Button size="lg" className="bg-white text-black font-bold hover:bg-gray-200">
                Explore Staking Pools
              </Button>
            </a>
          </div>
        </section>

        {/* Matches Section */}
        <section id="matches" className="py-16">
            <h2 className="text-3xl font-bold text-center mb-10">Upcoming Matches</h2>
            {matches.length > 0 ? (
                <div className="space-y-8">
                    <FeaturedMatch match={matches[0]} />
                    {matches.length > 1 && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                            {matches.slice(1).map((match) => (
                                <MatchCard key={match._id} match={match} />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center text-gray-500 mt-16 border border-dashed border-gray-700 p-12 rounded-lg">
                    <p className="text-xl">No Upcoming Matches</p>
                    <p>Please check back later for new staking opportunities.</p>
                </div>
            )}
        </section>

      </main>
    </div>
  );
};

export default LandingPage;