'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type Match } from '@/types';
import { type ParlaySelectionDetails } from './StakingInterface';
import useSWR from 'swr';
import { Gamepad2, Clock, Calendar, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface RecommendedMatchesProps {
  onSelectBet: (selection: ParlaySelectionDetails) => void;
  parlaySelections: ParlaySelectionDetails[];
  currentMatchId?: string;
}

// Mock odds generation
const getMockOdds = (matchId: string) => {
  const hash = matchId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    home: (1.5 + (hash % 10) / 10),
    draw: (3.0 + (hash % 5) / 10),
    away: (4.0 + (hash % 15) / 10),
  };
};

export function RecommendedMatches({ onSelectBet, parlaySelections, currentMatchId }: RecommendedMatchesProps) {
  const { data: matches, error, isLoading } = useSWR<Match[]>('/api/matches', fetcher);
  const [teamALogoErrors, setTeamALogoErrors] = useState<Record<string, boolean>>({});
  const [teamBLogoErrors, setTeamBLogoErrors] = useState<Record<string, boolean>>({});
  const defaultLogo = "https://s2.coinmarketcap.com/static/img/coins/64x64/24460.png";

  // Filter out current match and show only upcoming matches
  let recommendedMatches = matches?.filter(match => 
    match._id !== currentMatchId && 
    match.status === 'UPCOMING'
  ).slice(0, 4) || [];

  // Fallback to show any other matches if no upcoming ones are found.
  if (recommendedMatches.length === 0 && matches) {
    recommendedMatches = matches.filter(match => match._id !== currentMatchId).slice(0, 4);
  }

  const isMatchInParlay = (matchId: string) => {
    return parlaySelections.some(s => s.matchId === matchId);
  };

  const getAlphaPick = (match: Match) => {
    const { winA_prob, winB_prob, draw_prob } = match.alphaPredictions;
    if (winA_prob > winB_prob && winA_prob > draw_prob) {
      return { team: match.teamA.name, confidence: (winA_prob * 100).toFixed(0), outcomeId: 0 };
    }
    if (winB_prob > winA_prob && winB_prob > draw_prob) {
      return { team: match.teamB.name, confidence: (winB_prob * 100).toFixed(0), outcomeId: 2 };
    }
    return { team: 'Draw', confidence: (draw_prob * 100).toFixed(0), outcomeId: 1 };
  };

  const handleTeamALogoError = (matchId: string) => {
    setTeamALogoErrors(prev => ({ ...prev, [matchId]: true }));
  };

  const handleTeamBLogoError = (matchId: string) => {
    setTeamBLogoErrors(prev => ({ ...prev, [matchId]: true }));
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading recommended matches...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || recommendedMatches.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700">
        <CardContent className="p-8 text-center">
          <Gamepad2 size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">No recommended matches available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <TrendingUp className="text-blue-400" size={24} />
          <div>
            <div className="text-xl font-bold text-white">Recommended Matches</div>
            <div className="text-sm text-gray-400">Add to your parlay</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendedMatches.map(match => {
          const odds = getMockOdds(match._id);
          const alphaPick = getAlphaPick(match);
          const matchDate = new Date(match.matchTime);
          const isInParlay = isMatchInParlay(match._id);

          return (
            <div
              key={match._id}
              className={`p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg border transition-all duration-200 ${
                isInParlay ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700/50 hover:border-gray-600'
              }`}
            >
              {/* Match Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Image
                      src={teamALogoErrors[match._id] ? defaultLogo : match.teamA.logoUrl}
                      alt={match.teamA.name}
                      width={24}
                      height={24}
                      className="w-6 h-6"
                      onError={() => handleTeamALogoError(match._id)}
                    />
                    <span className="font-bold text-white text-sm">{match.teamA.name}</span>
                  </div>
                  <span className="text-gray-400 text-xs">vs</span>
                  <div className="flex items-center gap-2">
                    <Image
                      src={teamBLogoErrors[match._id] ? defaultLogo : match.teamB.logoUrl}
                      alt={match.teamB.name}
                      width={24}
                      height={24}
                      className="w-6 h-6"
                      onError={() => handleTeamBLogoError(match._id)}
                    />
                    <span className="font-bold text-white text-sm">{match.teamB.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar size={12} />
                    {matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Alpha Pick */}
              <div className="mb-3 p-2 bg-blue-900/20 rounded border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-400">Alpha Pick</span>
                  <Badge variant="outline" className="border-green-400/30 text-green-400 bg-green-400/10 text-xs">
                    {alphaPick.confidence}% confident
                  </Badge>
                </div>
                <div className="text-sm font-bold text-white mt-1">{alphaPick.team}</div>
              </div>

              {/* Betting Options */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isInParlay}
                  onClick={() => onSelectBet({
                    poolType: 'market',
                    matchId: match._id,
                    matchName: `${match.teamA.name} vs ${match.teamB.name}`,
                    selectionName: match.teamA.name,
                    selectionId: 0,
                    odds: odds.home
                  })}
                  className="border-gray-600 justify-between h-auto py-2 px-3"
                >
                  <span className="text-xs">{match.teamA.name}</span>
                  <span className="text-green-400 font-mono text-xs">{odds.home.toFixed(2)}x</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isInParlay}
                  onClick={() => onSelectBet({
                    poolType: 'market',
                    matchId: match._id,
                    matchName: `${match.teamA.name} vs ${match.teamB.name}`,
                    selectionName: 'Draw',
                    selectionId: 1,
                    odds: odds.draw
                  })}
                  className="border-gray-600 justify-between h-auto py-2 px-3"
                >
                  <span className="text-xs">Draw</span>
                  <span className="text-green-400 font-mono text-xs">{odds.draw.toFixed(2)}x</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isInParlay}
                  onClick={() => onSelectBet({
                    poolType: 'market',
                    matchId: match._id,
                    matchName: `${match.teamA.name} vs ${match.teamB.name}`,
                    selectionName: match.teamB.name,
                    selectionId: 2,
                    odds: odds.away
                  })}
                  className="border-gray-600 justify-between h-auto py-2 px-3"
                >
                  <span className="text-xs">{match.teamB.name}</span>
                  <span className="text-green-400 font-mono text-xs">{odds.away.toFixed(2)}x</span>
                </Button>
              </div>

              {isInParlay && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-blue-400">✓ Added to parlay</p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
} 