import { type GetServerSideProps, type NextPage } from "next";
import Image from "next/image";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StakingInterface, type ParlaySelectionDetails } from "@/components/features/StakingInterface";
import { AlphaInsight } from "@/components/features/AlphaInsight";
import { PredictionChart } from "@/components/features/PredictionChart";
import { FloatingParlay } from "@/components/features/FloatingParlay";
import { type MatchWithAnalysis } from "@/types";
import { useParlayState } from "@/hooks/use-parlay-state";
import { Calendar, Users, Clock, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { params } = context.params!;
  
  if (!Array.isArray(params) || params.length !== 2) {
    return { notFound: true };
  }

  const [teamsSlug, dateParam] = params;
  
  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = context.req.headers.host;
    
    // First try to find the match by team names and date
    const searchApiUrl = `${protocol}://${host}/api/matches/search?teams=${encodeURIComponent(teamsSlug)}&date=${dateParam}`;
    
    let res = await fetch(searchApiUrl);
    
    if (!res.ok) {
      console.warn(`Search API failed for ${teamsSlug}/${dateParam}, status: ${res.status}`);
      return { notFound: true };
    }
    
    const searchResult = await res.json();
    
    if (!searchResult.matchId) {
      return { notFound: true };
    }
    
    // Now get the full match data
    const matchApiUrl = `${protocol}://${host}/api/matches/${searchResult.matchId}`;
    res = await fetch(matchApiUrl);
    
    if (!res.ok) {
      console.warn(`Match API failed for ID ${searchResult.matchId}, status: ${res.status}`);
      return { notFound: true };
    }
    
    const match: MatchWithAnalysis = await res.json();
    return { props: { match } };

  } catch (error) {
    console.error(`Error fetching match ${teamsSlug}/${dateParam}:`, error);
    return { notFound: true };
  }
};

const MatchPage: NextPage<{ match: MatchWithAnalysis }> = ({ match }) => {
  const [teamALogoError, setTeamALogoError] = useState(false);
  const [teamBLogoError, setTeamBLogoError] = useState(false);
  const defaultLogo = "https://s2.coinmarketcap.com/static/img/coins/64x64/24460.png";

  // Use persistent parlay state
  const {
    parlaySelections,
    isLoaded,
    handleSelectBet,
    handleRemoveParlayItem,
    handleClearParlay,
    handlePlaceParlayBet,
    handlePlaceSingleBet
  } = useParlayState();

  const matchDate = new Date(match.matchTime);
  
  const getAlphaPick = () => {
    const { winA_prob, winB_prob, draw_prob } = match.alphaPredictions;
    if (winA_prob > winB_prob && winA_prob > draw_prob) return { team: match.teamA.name, confidence: (winA_prob * 100).toFixed(1) };
    if (winB_prob > winA_prob && winB_prob > draw_prob) return { team: match.teamB.name, confidence: (winB_prob * 100).toFixed(1) };
    return { team: 'Draw', confidence: (draw_prob * 100).toFixed(1) };
  };
  const alphaPick = getAlphaPick();

  // Show loading state until parlay state is loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

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
                
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={16} />
                        <time dateTime={match.matchTime} className="text-sm">
                            {matchDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </time>
                    </div>
                    {match.league && (
                      <div className="flex items-center gap-2 text-gray-400">
                          {match.league.logoUrl && (
                            <Image 
                              src={match.league.logoUrl}
                              alt={match.league.name}
                              width={16}
                              height={16}
                              className="w-4 h-4"
                            />
                          )}
                          <span className="text-sm">{match.league.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-400">
                        <Zap size={16} />
                        <span className="text-sm font-medium">Alpha Pick: {alphaPick.team} ({alphaPick.confidence}%)</span>
                    </div>
                </div>
             </div>
        </section>

        {/* Alpha Engine Prediction Charts */}
        <section className="mb-12">
          <PredictionChart match={match} />
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <StakingInterface 
              match={match}
              onSelectBet={handleSelectBet}
              onPlaceSingleBet={handlePlaceSingleBet}
              parlaySelections={parlaySelections}
            />
          </div>
          <div className="space-y-8 lg:sticky top-28">
            <AlphaInsight match={match} />
          </div>
        </div>
      </main>
      <Footer />
      
      {/* FloatingParlay outside main container to ensure proper positioning */}
      <FloatingParlay
          selections={parlaySelections}
          onRemove={handleRemoveParlayItem}
          onClear={handleClearParlay}
          onPlaceBet={handlePlaceParlayBet}
      />
    </div>
  );
};

export default MatchPage; 