import { type GetServerSideProps, type NextPage } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StakingInterface } from "@/components/features/StakingInterface";
import { AlphaInsight } from "@/components/features/AlphaInsight";
import { LiveOddsTicker } from "@/components/features/LiveOddsTicker";
import { type Match } from "@/types";
import { Calendar, Users } from "lucide-react";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = context.req.headers.host;
    const apiUrl = `${protocol}://${host}`;
    
    const res = await fetch(`${apiUrl}/api/matches/${id}`);
    if (!res.ok) {
      return { notFound: true };
    }
    const match: Match = await res.json();
    return { props: { match } };
  } catch (error) {
    console.error(error);
    return { notFound: true };
  }
};

const MatchPage: NextPage<{ match: Match }> = ({ match }) => {
  const matchDate = new Date(match.matchTime);

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {/* Match Header */}
        <section className="text-center mb-12 relative overflow-hidden rounded-xl p-8 border border-gray-800 bg-black/30">
             <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-blue-600 blur-xl opacity-10"></div>
             <div className="absolute inset-0 bg-grid-white/[0.03]"></div>
             <div className="relative">
                <div className="flex justify-center items-center gap-4 md:gap-8 mb-4">
                    <div className="flex flex-col items-center gap-4 w-1/3 md:w-auto">
                    <img src={match.teamA.logoUrl} alt={match.teamA.name} className="w-20 h-20 md:w-28 md:h-28 transition-transform hover:scale-105"/>
                    <h2 className="text-2xl md:text-4xl font-bold">{match.teamA.name}</h2>
                    </div>
                    <span className="text-4xl md:text-6xl font-light text-gray-500">vs</span>
                    <div className="flex flex-col items-center gap-4 w-1/3 md:w-auto">
                    <img src={match.teamB.logoUrl} alt={match.teamB.name} className="w-20 h-20 md:w-28 md:h-28 transition-transform hover:scale-105"/>
                    <h2 className="text-2xl md:text-4xl font-bold">{match.teamB.name}</h2>
                    </div>
                </div>
                <div className="flex items-center justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2 text-base text-gray-400">
                        <Calendar size={16} />
                        <time dateTime={match.matchTime}>
                            {matchDate.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </time>
                    </div>
                    <div className="flex items-center gap-2 text-base text-gray-400">
                        <Users size={16} />
                        <span>{match.league || 'Major League'}</span>
                    </div>
                </div>
             </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <StakingInterface match={match} />
          </div>
          <div className="space-y-8 lg:sticky top-28">
            <LiveOddsTicker match={match} />
            <AlphaInsight />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MatchPage; 