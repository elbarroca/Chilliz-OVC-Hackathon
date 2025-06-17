import { type GetServerSideProps, type NextPage } from "next";
import Image from "next/image";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StakingInterface } from "@/components/features/StakingInterface";
import { AlphaInsight } from "@/components/features/AlphaInsight";
import { LiveOddsTicker } from "@/components/features/LiveOddsTicker";
import { PredictionChart } from "@/components/features/PredictionChart";
import { type MatchWithAnalysis } from "@/types";
import { Calendar, Users, Clock, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  
  if (typeof id !== 'string') {
    return { notFound: true };
  }

  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = context.req.headers.host;
    const apiUrl = `${protocol}://${host}/api/matches/${id}`;
    
    const res = await fetch(apiUrl);
    
    if (!res.ok) {
      console.warn(`API failed for match ${id}, status: ${res.status}.`);
      return { notFound: true };
    }
    
    const match: MatchWithAnalysis = await res.json();
    return { props: { match } };

  } catch (error) {
    console.error(`Error fetching match ${id}:`, error);
    return { notFound: true };
  }
};

const MatchPage: NextPage<{ match: MatchWithAnalysis }> = ({ match }) => {
  const [teamALogoError, setTeamALogoError] = useState(false);
  const [teamBLogoError, setTeamBLogoError] = useState(false);
  const defaultLogo = "https://s2.coinmarketcap.com/static/img/coins/64x64/24460.png";

  const matchDate = new Date(match.matchTime);
  
  const getAlphaPick = () => {
    const { winA_prob, winB_prob, draw_prob } = match.alphaPredictions;
    if (winA_prob > winB_prob && winA_prob > draw_prob) return { team: match.teamA.name, confidence: (winA_prob * 100).toFixed(1) };
    if (winB_prob > winA_prob && winB_prob > draw_prob) return { team: match.teamB.name, confidence: (winB_prob * 100).toFixed(1) };
    return { team: 'Draw', confidence: (draw_prob * 100).toFixed(1) };
  };
  const alphaPick = getAlphaPick();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {/* Match Header */}
        <section className="text-center mb-12 relative overflow-hidden rounded-2xl p-8 md:p-12 border border-gray-800 bg-gradient-to-br from-[#1A1A1A] to-black">
             <div className="absolute -inset-2 bg-gradient-to-r from-gray-600 to-gray-700 blur-2xl opacity-10"></div>
             <div className="absolute inset-0 bg-grid-white/[0.03]"></div>
             <div className="relative">
                {/* Match Status Badge */}
                <div className="flex justify-center mb-6">
                  <Badge className="bg-gradient-to-r from-gray-700 to-gray-800 text-white border-0 px-6 py-2 text-sm font-bold">
                    {match.status === 'UPCOMING' ? '🔥 LIVE BETTING' : match.status}
                  </Badge>
                </div>

                <div className="flex justify-center items-center gap-6 md:gap-12 mb-8">
                    <div className="flex flex-col items-center gap-4 w-1/3 md:w-auto">
                      <div className="relative group">
                        <Image 
                          src={teamALogoError ? defaultLogo : match.teamA.logoUrl}
                          alt={match.teamA.name} 
                          className="w-24 h-24 md:w-32 md:h-32 transition-transform group-hover:scale-110"
                          width={128}
                          height={128}
                          onError={() => setTeamALogoError(true)}
                        />
                        <div className="absolute -inset-2 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-lg"></div>
                      </div>
                      <h2 className="text-xl md:text-3xl font-bold">{match.teamA.name}</h2>
                    </div>
                    
                    <div className="text-center">
                      <span className="text-4xl md:text-6xl font-light text-gray-400 mb-2 block">VS</span>
                      <div className="flex items-center justify-center gap-2 text-gray-400">
                        <Clock size={14} />
                        <span className="text-xs font-medium">
                          {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4 w-1/3 md:w-auto">
                      <div className="relative group">
                        <Image 
                          src={teamBLogoError ? defaultLogo : match.teamB.logoUrl} 
                          alt={match.teamB.name} 
                          className="w-24 h-24 md:w-32 md:h-32 transition-transform group-hover:scale-110"
                          width={128}
                          height={128}
                          onError={() => setTeamBLogoError(true)}
                        />
                        <div className="absolute -inset-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-lg"></div>
                      </div>
                      <h2 className="text-xl md:text-3xl font-bold">{match.teamB.name}</h2>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={16} />
                        <time dateTime={match.matchTime} className="text-sm">
                            {matchDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </time>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <Users size={16} />
                        <span className="text-sm">{match.league || 'Major League'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <Zap size={16} />
                        <span className="text-sm font-medium">Alpha Pick: {alphaPick.team} ({alphaPick.confidence}%)</span>
                    </div>
                </div>
             </div>
        </section>

        {/* Alpha Engine Prediction Charts */}
        {match.alphaAnalysis ? (
          <section className="mb-12">
            <PredictionChart 
              alphaAnalysis={match.alphaAnalysis}
              teamAName={match.teamA.name}
              teamBName={match.teamB.name}
            />
          </section>
        ) : (
          <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700 mb-12">
            <CardContent className="p-6 text-center text-gray-400">
              Alpha Engine analysis is not yet available for this match.
            </CardContent>
          </Card>
        )}

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