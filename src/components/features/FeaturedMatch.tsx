import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Match } from '@/types';
import { Calendar, Users, Zap, TrendingUp, Clock, BarChart3, Target } from 'lucide-react';

// Helper function to create SEO-friendly URLs
function createMatchUrl(teamA: string, teamB: string, matchDate: string): string {
  const createSlug = (name: string) => 
    name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  
  const teamSlug = `${createSlug(teamA)}-vs-${createSlug(teamB)}`;
  const date = new Date(matchDate).toISOString().split('T')[0];
  return `/match/${teamSlug}/${date}`;
}

// Mock data for visualization. In a real app, this would come from on-chain reads.
const mockPoolState = {
  market: { total: 1500, onTeamA: 1000, onDraw: 200, onTeamB: 300 },
  alpha: { total: 850, onTeamA: 600, onDraw: 150, onTeamB: 100 },
};

// A simple progress bar component for visualization
function PoolProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-2.5">
      <div className={`${colorClass} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
  );
}

export function FeaturedMatch({ match }: { match: Match }) {
  const marketTeamAPercentage = (mockPoolState.market.onTeamA / mockPoolState.market.total) * 100;
  const alphaTeamAPercentage = (mockPoolState.alpha.onTeamA / mockPoolState.alpha.total) * 100;
  const matchDate = new Date(match.matchTime);
  const matchUrl = createMatchUrl(match.teamA.name, match.teamB.name, match.matchTime);

  const getAlphaPick = () => {
    const { winA_prob, winB_prob, draw_prob } = match.alphaPredictions;
    if (winA_prob > winB_prob && winA_prob > draw_prob) return { team: match.teamA.name, confidence: (winA_prob * 100).toFixed(1) };
    if (winB_prob > winA_prob && winB_prob > draw_prob) return { team: match.teamB.name, confidence: (winB_prob * 100).toFixed(1) };
    return { team: 'Draw', confidence: (draw_prob * 100).toFixed(1) };
  };
  const alphaPick = getAlphaPick();

  // Extract enhanced data from analysis if available
  const analysisData = match.analysisData;
  const expectedGoals = analysisData?.expected_goals;
  const marketProbabilities = analysisData?.match_outcome_probabilities?.monte_carlo;

  return (
    <div className="group relative">
      <div className="absolute -inset-1 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl blur-lg opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-300"></div>
      <Card className="relative bg-gradient-to-br from-[#1A1A1A] to-[#101010] border-gray-800 overflow-hidden">
        <CardContent className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Badge variant="secondary" className="bg-gradient-to-r from-gray-700 to-gray-800 text-white border-0 px-4 py-2 font-bold">
              ⭐ FEATURED MATCH
            </Badge>
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar size={16} />
              <time dateTime={match.matchTime} className="text-sm font-mono">
                {matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-8">
            {/* Team A */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={80} height={80} className="w-20 h-20 group-hover:scale-110 transition-transform duration-300"/>
                <div className="absolute -inset-1 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{match.teamA.name}</h3>
                {match.league && <p className="text-sm text-gray-400">{match.league.name || 'Major League'}</p>}
              </div>
            </div>
            
            {/* VS */}
            <div className="text-center">
              <div className="relative">
                <p className="text-4xl font-light text-gray-400 mb-2">VS</p>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-gray-600/10 rounded-full blur-xl opacity-50"></div>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Clock size={14} />
                <span className="text-xs font-medium">UPCOMING</span>
              </div>
            </div>

            {/* Team B */}
            <div className="flex items-center gap-4 justify-end">
              <div className="text-right">
                <h3 className="text-2xl font-bold text-white">{match.teamB.name}</h3>
                {match.league && <p className="text-sm text-gray-400">{match.league.name || 'Major League'}</p>}
              </div>
              <div className="relative">
                <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={80} height={80} className="w-20 h-20 group-hover:scale-110 transition-transform duration-300"/>
                <div className="absolute -inset-1 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </div>
            </div>
          </div>

          {/* Enhanced Analytics Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Expected Goals */}
            {expectedGoals && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-900/30 to-black border border-blue-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-blue-400" />
                  <h4 className="font-semibold text-gray-300">Expected Goals (xG)</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{match.teamA.name}</span>
                    <span className="font-mono text-white">{expectedGoals.home.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{match.teamB.name}</span>
                    <span className="font-mono text-white">{expectedGoals.away.toFixed(2)}</span>
                  </div>
                  <div className="pt-1 border-t border-gray-700/50">
                    <div className="flex justify-between text-xs text-blue-300">
                      <span>Total xG</span>
                      <span className="font-mono">{(expectedGoals.home + expectedGoals.away).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Market Pool */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/50 to-black border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-gray-400" />
                <h4 className="font-semibold text-gray-300">Market Pool</h4>
                <Badge variant="outline" className="text-xs bg-gray-800 text-gray-300 border-gray-600">
                  Community Choice
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Staked</span>
                  <span className="font-mono text-white">{mockPoolState.market.total} CHZ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Leading</span>
                  <span className="font-medium text-gray-300">{match.teamA.name} ({marketTeamAPercentage.toFixed(1)}%)</span>
                </div>
              </div>
            </div>

            {/* Alpha Pool with Enhanced Data */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/30 to-black border border-purple-700/50">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} className="text-purple-400" />
                <h4 className="font-semibold text-gray-300">Alpha Engine</h4>
                <Badge variant="outline" className="text-xs bg-purple-800/50 text-purple-300 border-purple-600">
                  AI Powered
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Prediction</span>
                  <span className="font-medium text-white">{alphaPick.team}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Confidence</span>
                  <span className="font-mono text-purple-300">{alphaPick.confidence}%</span>
                </div>
                {marketProbabilities && (
                  <div className="pt-1 border-t border-gray-700/50">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>BTTS</span>
                      <span>{(marketProbabilities.both_teams_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>O2.5</span>
                      <span>{(marketProbabilities.over_2_5_goals * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <Button asChild size="lg" className="bg-white text-black font-bold hover:bg-gray-200 px-12 py-6 text-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-gray-500/25">
              <Link href={matchUrl} className="flex items-center gap-2">
                <TrendingUp size={20} />
                View Pools & Place Stake
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}