import { type GetServerSideProps, type NextPage } from "next";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StakingInterface, type ParlaySelectionDetails } from "@/components/features/StakingInterface";
import { AlphaInsight } from "@/components/features/AlphaInsight";
import { PredictionChart } from "@/components/features/PredictionChart";
import { ParlayBuilder } from "@/components/features/ParlayBuilder";
import { UpcomingMatchesSelector, type ParlaySelection } from "@/components/features/UpcomingMatchesSelector";
import { RecommendedMatches } from "@/components/features/RecommendedMatches";
import { FloatingParlay } from "@/components/features/FloatingParlay";
import { type MatchWithAnalysis, type AlphaAnalysis } from "@/types";
import { Calendar, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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

  const [parlaySelections, setParlaySelections] = useState<ParlaySelectionDetails[]>([]);

  // Debug effect to track parlay changes
  useEffect(() => {
    console.log('Parlay selections updated:', parlaySelections);
  }, [parlaySelections]);

  const matchDate = new Date(match.matchTime);
  
  const getAlphaPick = () => {
    const { winA_prob, winB_prob, draw_prob } = match.alphaPredictions;
    if (winA_prob > winB_prob && winA_prob > draw_prob) return { team: match.teamA.name, confidence: (winA_prob * 100).toFixed(1) };
    if (winB_prob > winA_prob && winB_prob > draw_prob) return { team: match.teamB.name, confidence: (winB_prob * 100).toFixed(1) };
    return { team: 'Draw', confidence: (draw_prob * 100).toFixed(1) };
  };
  const alphaPick = getAlphaPick();

  const handleSelectBet = (selection: ParlaySelectionDetails | ParlaySelection) => {
    console.log('handleSelectBet called with:', selection); // Debug log
    console.log('Current parlay selections before update:', parlaySelections); // Debug log
    setParlaySelections(prev => {
        const currentSelections = [...(prev || [])];
        
        // Ensure every selection is in the new `ParlaySelectionDetails` format
        const newSelection: ParlaySelectionDetails = 'poolType' in selection 
            ? selection 
            : {
                ...selection,
                poolType: 'market', // Assume 'market' for older selection types
            };

        const existingSelectionIndex = currentSelections.findIndex(s => s.matchId === newSelection.matchId);

        if (existingSelectionIndex > -1) {
            const newSelections = [...currentSelections];
            // If the exact same bet is clicked again, deselect it.
            if (newSelections[existingSelectionIndex].selectionId === newSelection.selectionId &&
                newSelections[existingSelectionIndex].poolType === newSelection.poolType) 
            {
                newSelections.splice(existingSelectionIndex, 1);
                return newSelections;
            }
            // If a different bet for the same match is clicked, replace the old one.
            newSelections[existingSelectionIndex] = newSelection;
            return newSelections;
        } else {
            // Otherwise, add the new selection to the parlay.
            const updatedSelections = [...currentSelections, newSelection];
            console.log('Adding new selection, updated parlay:', updatedSelections); // Debug log
            return updatedSelections;
        }
    });
  };

  const handleRemoveParlayItem = (matchId: string) => {
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

  const handlePlaceSingleBet = (selection: ParlaySelectionDetails, amount: number) => {
    // TODO: Implement actual single betting logic
    console.log('Placing single bet for:', amount, 'CHZ with selection:', selection);
    alert(`Single bet of ${amount} CHZ placed on ${selection.selectionName}! (See console for details)`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {/* Match Header */}
        <section className="text-center mb-12 relative overflow-hidden rounded-2xl p-8 md:p-12 border border-gray-800 bg-gradient-to-br from-[#1A1A1A] to-black">
             <div className="absolute -inset-2 bg-gradient-to-r from-gray-600 to-gray-700 blur-2xl opacity-10"></div>
             <div className="absolute inset-0 bg-grid-white/[0.03]"></div>
             <div className="relative">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
              <AccordionItem value="item-1" className="border-none">
                <AccordionTrigger className="text-2xl font-bold text-white hover:no-underline">AI Insights</AccordionTrigger>
                <AccordionContent>
                  <PredictionChart 
                    match={match}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <h2 className="text-2xl font-bold text-white">Betting Markets</h2>
            
            {parlaySelections.length > 0 && (
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-bold">
                      {parlaySelections.length}
                    </span>
                    Parlay Selections
                  </h3>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Combined Odds</p>
                    <p className="text-xl font-bold text-green-400 font-mono">
                      {parlaySelections.reduce((acc, bet) => acc * bet.odds, 1).toFixed(2)}x
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {parlaySelections.map((selection, index) => (
                    <div key={`${selection.matchId}-${selection.selectionId}`} className="bg-gray-800/50 rounded p-3 border border-gray-700/50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-white">{selection.selectionName}</p>
                          <p className="text-xs text-gray-400">{selection.matchName}</p>
                        </div>
                        <span className="font-mono text-green-400 font-bold">{selection.odds.toFixed(2)}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <StakingInterface 
              match={match}
              onSelectBet={handleSelectBet}
              onPlaceSingleBet={handlePlaceSingleBet}
              parlaySelections={parlaySelections}
            />
            
            <div className="pt-8">
              <h2 className="text-2xl font-bold text-white mb-4">More Matches</h2>
              <RecommendedMatches 
                onSelectBet={handleSelectBet}
                parlaySelections={parlaySelections}
                currentMatchId={match._id}
              />
            </div>
          </div>

          <div className="space-y-8 lg:sticky top-28">
             <AlphaInsight match={match} />
          </div>
        </div>
        
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 left-4 bg-black/80 text-white p-2 rounded text-xs z-50">
            Parlay Selections: {parlaySelections.length}
            {parlaySelections.length > 0 && (
              <div>
                {parlaySelections.map((s, i) => (
                  <div key={i}>{s.selectionName} - {s.odds}x</div>
                ))}
              </div>
            )}
          </div>
        )}
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