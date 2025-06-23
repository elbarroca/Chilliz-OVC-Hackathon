'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { type MatchWithAnalysis } from '@/types';
import { Heart, Bot, Goal, Shield, Plus, Wallet } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export interface ParlaySelectionDetails {
    matchId: string;
    matchName: string;
    selectionId: string;
    selectionName: string;
    odds: number;
    poolType: 'market' | 'alpha' | 'btts' | 'goals';
    teamAName: string;
    teamBName: string;
}

interface StakingInterfaceProps {
    match: MatchWithAnalysis;
    onSelectBet?: (details: ParlaySelectionDetails) => void;
    onPlaceSingleBet?: (selection: ParlaySelectionDetails, amount: number) => void;
    parlaySelections?: ParlaySelectionDetails[];
    showMarkets?: ('market' | 'alpha' | 'btts' | 'goals')[];
}

const generateDynamicMarketData = (matchId: string) => {
    const hash = matchId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
        market: {
            total: 1200 + (hash % 500),
            teamA: { payout: (1.5 + (hash % 10) / 10) },
            draw: { payout: (3.0 + (hash % 5) / 10) },
            teamB: { payout: (4.0 + (hash % 15) / 10) },
        },
        alpha: {
            total: 800 + (hash % 300),
            teamA: { payout: (1.6 + (hash % 8) / 10) },
            draw: { payout: (3.5 + (hash % 6) / 10) },
            teamB: { payout: (4.8 + (hash % 12) / 10) },
        },
        btts: {
            yes: { payout: 1.80 },
            no: { payout: 1.90 },
        },
        goals: {
            'o1.5': { payout: 1.45 },
            'u1.5': { payout: 2.55 },
            'o2.5': { payout: 2.10 },
            'u2.5': { payout: 1.70 },
        }
    };
};

export function StakingInterface({ match, onSelectBet, onPlaceSingleBet, parlaySelections = [], showMarkets = ['market', 'alpha', 'btts', 'goals'] }: StakingInterfaceProps) {
  const dynamicMarketData = generateDynamicMarketData(match._id);
  const [selectedBet, setSelectedBet] = useState<ParlaySelectionDetails | null>(null);
  const [singleBetAmount, setSingleBetAmount] = useState('');
  const [showBettingOptions, setShowBettingOptions] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowBettingOptions(null);
        setSelectedBet(null);
        setSingleBetAmount('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const outcomes = [
    { name: match.teamA.name, outcomeId: 0 },
    { name: 'Draw', outcomeId: 1 },
    { name: match.teamB.name, outcomeId: 2 },
  ];

  const handleSelect = (details: ParlaySelectionDetails) => {
    setSelectedBet(details);
    setShowBettingOptions(details.selectionId);
  }

  const handleAddToParlay = () => {
    if (selectedBet && onSelectBet) {
      onSelectBet(selectedBet);
      setShowBettingOptions(null);
      setSelectedBet(null);
    }
  }

  const handlePlaceSingle = () => {
    if (selectedBet && onPlaceSingleBet && singleBetAmount) {
      onPlaceSingleBet(selectedBet, parseFloat(singleBetAmount));
      setShowBettingOptions(null);
      setSelectedBet(null);
      setSingleBetAmount('');
    }
  }

  const BettingDropdown = ({ betDetails, isActive }: { betDetails: ParlaySelectionDetails, isActive: boolean }) => {
    if (!isActive) return null;
    
    return (
      <div className="absolute top-full left-0 right-0 z-20 mt-2 p-4 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-600 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-white flex items-center gap-2">{betDetails.selectionName}</h4>
          <div className="text-right">
            <span className="text-2xl font-bold text-green-400 font-mono">{betDetails.odds.toFixed(2)}x</span>
            <p className="text-xs text-gray-400">Odds</p>
          </div>
        </div>
        <div className="space-y-3">
          <Button onClick={handleAddToParlay} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold">
            <Plus size={18} className="mr-2" />Add to Parlay
          </Button>
          <div className="border-t border-gray-600 pt-3">
            <p className="text-sm text-gray-300 mb-3 font-medium">Or place single bet:</p>
            <div className="space-y-3">
              <Input
                type="number"
                placeholder="Enter amount (CHZ)"
                value={singleBetAmount}
                onChange={(e) => setSingleBetAmount(e.target.value)}
                className="w-full bg-gray-700 border-gray-500 text-white"
              />
              {singleBetAmount && parseFloat(singleBetAmount) > 0 && (
                <div className="p-3 bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-600/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Potential Win:</span>
                    <span className="text-lg font-bold text-green-400 font-mono">
                      {(parseFloat(singleBetAmount) * betDetails.odds).toFixed(2)} CHZ
                    </span>
                  </div>
                </div>
              )}
              <Button onClick={handlePlaceSingle} disabled={!singleBetAmount || parseFloat(singleBetAmount) <= 0} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold">
                <Wallet size={16} className="mr-2" />Place Bet Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isOutcomeSelected = (selectionId: string) => parlaySelections?.some(s => s.selectionId === selectionId) || false;

  const renderMarketCard = (type: 'market' | 'alpha') => {
    if (!showMarkets.includes(type)) return null;

    const poolData = type === 'market' ? dynamicMarketData.market : dynamicMarketData.alpha;
    const title = type === 'market' ? 'Market Pool' : 'Alpha Pool';
    const icon = type === 'market' ? <Heart className="text-red-400" /> : <Bot className="text-blue-400" />;
    
    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-bold text-white">{title}</span>
                </div>
                <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">{poolData.total.toFixed(0)} CHZ</Badge>
            </div>
            <div className="space-y-2">
                {outcomes.map(({ name, outcomeId }) => {
                    const data = outcomeId === 0 ? poolData.teamA : outcomeId === 1 ? poolData.draw : poolData.teamB;
                    const selectionId = `${match._id}-${type}-${outcomeId}`;
                    const isSelected = isOutcomeSelected(selectionId);
                    const betDetails: ParlaySelectionDetails = {
                        poolType: type,
                        matchId: match._id,
                        matchName: `${match.teamA.name} vs ${match.teamB.name}`,
                        selectionName: name,
                        selectionId,
                        odds: data.payout,
                        teamAName: match.teamA.name,
                        teamBName: match.teamB.name
                    };
                    return (
                        <div key={selectionId} className="relative">
                            <Button variant={'ghost'} size="lg" onClick={() => handleSelect(betDetails)} className={`w-full justify-between text-base p-4 h-auto ${isSelected ? 'bg-blue-600/60' : 'bg-gray-800/70'}`}>
                                <span className="font-semibold text-white">{name}</span>
                                <span className="font-mono text-lg text-green-400">{data.payout.toFixed(2)}x</span>
                            </Button>
                            <BettingDropdown betDetails={betDetails} isActive={showBettingOptions === selectionId} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const renderBTTSCard = () => {
    if (!showMarkets.includes('btts')) return null;
    const bttsData = dynamicMarketData.btts;

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3"><Shield className="text-yellow-400" /><span className="font-bold text-white">Both Teams To Score</span></div>
            <div className="grid grid-cols-2 gap-2">
                {(['Yes', 'No'] as const).map(option => {
                    const selectionId = `${match._id}-btts-${option.toLowerCase()}`;
                    const isSelected = isOutcomeSelected(selectionId);
                    const betDetails: ParlaySelectionDetails = {
                        poolType: 'btts',
                        matchId: match._id,
                        matchName: `${match.teamA.name} vs ${match.teamB.name}`,
                        selectionName: `BTTS: ${option}`,
                        selectionId,
                        odds: bttsData[option.toLowerCase() as 'yes' | 'no'].payout,
                        teamAName: match.teamA.name,
                        teamBName: match.teamB.name
                    };
                    return (
                        <div key={selectionId} className="relative">
                            <Button variant="ghost" size="lg" onClick={() => handleSelect(betDetails)} className={`w-full justify-between text-base p-4 h-auto ${isSelected ? 'bg-blue-600/60' : 'bg-gray-800/70'}`}>
                                <span className="font-semibold text-white">{option}</span>
                                <span className="font-mono text-lg text-green-400">{bttsData[option.toLowerCase() as 'yes' | 'no'].payout.toFixed(2)}x</span>
                            </Button>
                            <BettingDropdown betDetails={betDetails} isActive={showBettingOptions === selectionId} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const renderGoalsCard = () => {
    if (!showMarkets.includes('goals')) return null;
    const goalsData = dynamicMarketData.goals;
    const options = [
      { label: 'Over 1.5', key: 'o1.5' }, { label: 'Under 1.5', key: 'u1.5' },
      { label: 'Over 2.5', key: 'o2.5' }, { label: 'Under 2.5', key: 'u2.5' },
    ] as const;

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3"><Goal className="text-green-400" /><span className="font-bold text-white">Total Goals</span></div>
            <div className="grid grid-cols-2 gap-2">
                {options.map(option => {
                    const selectionId = `${match._id}-goals-${option.key}`;
                    const isSelected = isOutcomeSelected(selectionId);
                    const betDetails: ParlaySelectionDetails = {
                        poolType: 'goals',
                        matchId: match._id,
                        matchName: `${match.teamA.name} vs ${match.teamB.name}`,
                        selectionName: option.label,
                        selectionId,
                        odds: goalsData[option.key].payout,
                        teamAName: match.teamA.name,
                        teamBName: match.teamB.name
                    };
                    return (
                        <div key={selectionId} className="relative">
                            <Button variant="ghost" size="lg" onClick={() => handleSelect(betDetails)} className={`w-full justify-between text-base p-3 h-auto ${isSelected ? 'bg-blue-600/60' : 'bg-gray-800/70'}`}>
                                <span className="font-semibold text-white">{option.label}</span>
                                <span className="font-mono text-lg text-green-400">{goalsData[option.key].payout.toFixed(2)}x</span>
                            </Button>
                            <BettingDropdown betDetails={betDetails} isActive={showBettingOptions === selectionId} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };
  
  return (
    <div ref={containerRef} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderMarketCard('market')}
        {renderMarketCard('alpha')}
      </div>
      {renderBTTSCard()}
      {renderGoalsCard()}
    </div>
  );
}