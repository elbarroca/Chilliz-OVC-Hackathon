'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Match } from '@/types';
import { Heart, Bot, Users, Zap, Goal, Shield, ChevronDown, Plus, Wallet } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState, useEffect, useRef } from 'react';

export interface ParlaySelectionDetails {
    poolType: 'market' | 'alpha' | 'btts' | 'goals';
    matchId: string;
    matchName: string;
    selectionName: string;
    selectionId: number | string;
    odds: number;
}

interface StakingInterfaceProps {
    match: Match;
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
            teamA: { payout: (1.5 + (hash % 10) / 10), staked: 400 + (hash % 200) },
            draw: { payout: (3.0 + (hash % 5) / 10), staked: 200 + (hash % 100) },
            teamB: { payout: (4.0 + (hash % 15) / 10), staked: 300 + (hash % 150) },
        },
        alpha: {
            total: 800 + (hash % 300),
            teamA: { payout: (1.6 + (hash % 8) / 10), staked: 300 + (hash % 100) },
            draw: { payout: (3.5 + (hash % 6) / 10), staked: 150 + (hash % 80) },
            teamB: { payout: (4.8 + (hash % 12) / 10), staked: 250 + (hash % 120) },
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
            'o3.5': { payout: 3.50 },
            'u3.5': { payout: 1.30 },
        }
    };
};

export function StakingInterface({ match, onSelectBet, onPlaceSingleBet, parlaySelections = [], showMarkets = ['market', 'alpha', 'btts', 'goals'] }: StakingInterfaceProps) {
  const dynamicMarketData = generateDynamicMarketData(match._id);
  const [selectedBet, setSelectedBet] = useState<ParlaySelectionDetails | null>(null);
  const [singleBetAmount, setSingleBetAmount] = useState('');
  const [showBettingOptions, setShowBettingOptions] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close betting options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowBettingOptions(null);
        setSelectedBet(null);
        setSingleBetAmount('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const outcomes = [
    { name: match.teamA.name, outcomeId: 0 },
    { name: 'Draw', outcomeId: 1 },
    { name: match.teamB.name, outcomeId: 2 },
  ];

  const handleSelect = (details: ParlaySelectionDetails) => {
    console.log('Selection made:', details); // Debug log
    setSelectedBet(details);
    setShowBettingOptions(`${details.poolType}-${details.selectionId}`);
  }

  const handleAddToParlay = () => {
    console.log('Adding to parlay:', selectedBet); // Debug log
    console.log('Current parlay selections before add:', parlaySelections); // Debug log
    if (selectedBet && onSelectBet) {
      onSelectBet(selectedBet);
      setShowBettingOptions(null);
      setSelectedBet(null);
      console.log('Parlay selection sent to parent'); // Debug log
    } else {
      console.error('Missing selectedBet or onSelectBet callback:', { selectedBet, onSelectBet });
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
      <div className="absolute top-full left-0 right-0 z-20 mt-2 p-4 bg-gray-800 border border-gray-600 rounded-lg shadow-xl animate-in slide-in-from-top-2 duration-200">
        <h4 className="font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          {betDetails.selectionName}
        </h4>
        <div className="space-y-3">
          <Button
            onClick={handleAddToParlay}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105"
          >
            <Plus size={16} />
            Add to Parlay ({betDetails.odds.toFixed(2)}x)
          </Button>
          
          <div className="border-t border-gray-600 pt-3">
            <p className="text-xs text-gray-400 mb-2">Or place a single bet:</p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Amount (CHZ)"
                value={singleBetAmount}
                onChange={(e) => setSingleBetAmount(e.target.value)}
                className="flex-1 bg-gray-700 border-gray-600 text-white"
                min="0"
                step="0.01"
              />
              <Button
                onClick={handlePlaceSingle}
                disabled={!singleBetAmount || parseFloat(singleBetAmount) <= 0}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wallet size={16} />
                Bet Now
              </Button>
            </div>
            {singleBetAmount && parseFloat(singleBetAmount) > 0 && (
              <div className="mt-2 p-2 bg-green-900/20 border border-green-700/50 rounded text-center">
                <p className="text-sm text-green-400 font-medium">
                  Potential win: <span className="font-bold">{(parseFloat(singleBetAmount) * betDetails.odds).toFixed(2)} CHZ</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const isOutcomeSelected = (poolType: 'market' | 'alpha' | 'btts' | 'goals', selectionId: number | string) => {
    return parlaySelections?.some(
        s => s.matchId === match._id && s.poolType === poolType && s.selectionId === selectionId
    ) || false;
  }

  const isMatchInParlay = parlaySelections?.some(s => s.matchId === match._id) || false;

  const renderMarketCard = (type: 'market' | 'alpha') => {
    if (!showMarkets.includes(type)) return null;

    const poolData = type === 'market' ? dynamicMarketData.market : dynamicMarketData.alpha;
    const title = type === 'market' ? 'Market Pool' : 'Alpha Pool';
    const icon = type === 'market' ? <Heart className="text-red-400" /> : <Bot className="text-blue-400" />;
    
    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 flex flex-col h-full">
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-bold text-white">{title}</span>
                </div>
                <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                    {poolData.total.toFixed(0)} CHZ
                </Badge>
            </div>
            <div className="space-y-2 flex-grow flex flex-col justify-end">
                {outcomes.map(({ name, outcomeId }) => {
                    const data = outcomeId === 0 ? poolData.teamA :
                                    outcomeId === 1 ? poolData.draw :
                                    poolData.teamB;
                    const isSelected = isOutcomeSelected(type, outcomeId);

                    const betDetails = {
                        poolType: type,
                        matchId: match._id,
                        matchName: `${match.teamA.name} vs ${match.teamB.name}`,
                        selectionName: name,
                        selectionId: outcomeId,
                        odds: data.payout
                    };
                    const isDropdownActive = showBettingOptions === `${type}-${outcomeId}`;

                    return (
                        <div key={name} className="relative">
                            <Button
                                variant={'ghost'}
                                size="lg"
                                onClick={() => handleSelect(betDetails)}
                                className={`w-full justify-between text-base p-4 h-auto transition-all duration-200 rounded-md ${isSelected ? 'bg-blue-600/50 border border-blue-400/50' : isDropdownActive ? 'bg-gray-700' : 'bg-gray-800/50 hover:bg-gray-700/80'}`}
                            >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-300">{name}</span>
                                  {isSelected && <span className="text-blue-400 text-xs">✓ In Parlay</span>}
                                </div>
                                <span className="font-mono text-lg font-bold text-green-400">{data.payout.toFixed(2)}x</span>
                            </Button>
                            <BettingDropdown betDetails={betDetails} isActive={isDropdownActive} />
                        </div>
                    );
                })}
            </div>
        </div>
    )
  }

  // BTTS market component
  const renderBTTSCard = () => {
    if (!showMarkets.includes('btts')) return null;

    const bttsOptions = [
      { label: 'Yes', selectionId: 'yes', odds: dynamicMarketData.btts.yes.payout },
      { label: 'No', selectionId: 'no', odds: dynamicMarketData.btts.no.payout },
    ];

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Shield className="text-yellow-400" />
                    <span className="font-bold text-white">Both Teams To Score</span>
                </div>
            </div>
            <div className="space-y-2 flex-grow flex flex-col justify-end">
                {bttsOptions.map(({ label, selectionId, odds }) => {
                    const isSelected = isOutcomeSelected('btts', selectionId);
                    const betDetails = {
                        poolType: 'btts' as const,
                        matchId: match._id,
                        matchName: `${match.teamA.name} vs ${match.teamB.name}`,
                        selectionName: `BTTS: ${label}`,
                        selectionId: selectionId,
                        odds: odds
                    };
                    const isDropdownActive = showBettingOptions === `btts-${selectionId}`;

                    return (
                        <div key={selectionId} className="relative">
                            <Button
                                variant={'ghost'}
                                size="lg"
                                onClick={() => handleSelect(betDetails)}
                                className={`w-full justify-between text-base p-4 h-auto transition-all duration-200 rounded-md ${isSelected ? 'bg-blue-600/50 border border-blue-400/50' : isDropdownActive ? 'bg-gray-700' : 'bg-gray-800/50 hover:bg-gray-700/80'}`}
                            >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-300">{label}</span>
                                  {isSelected && <span className="text-blue-400 text-xs">✓ In Parlay</span>}
                                </div>
                                <span className="font-mono text-lg font-bold text-green-400">{odds.toFixed(2)}x</span>
                            </Button>
                            <BettingDropdown betDetails={betDetails} isActive={isDropdownActive} />
                        </div>
                    );
                })}
            </div>
        </div>
    )
  }

  // Goals market component - under/above
  const renderGoalsCard = () => {
    if (!showMarkets.includes('goals')) return null;

    const goalsData = dynamicMarketData.goals;
    
    const underOptions = [
      { label: 'Under 1.5', selectionId: 'u1.5', odds: goalsData['u1.5'].payout },
      { label: 'Under 2.5', selectionId: 'u2.5', odds: goalsData['u2.5'].payout },
      { label: 'Under 3.5', selectionId: 'u3.5', odds: goalsData['u3.5'].payout },
    ];

    const overOptions = [
      { label: 'Over 1.5', selectionId: 'o1.5', odds: goalsData['o1.5'].payout },
      { label: 'Over 2.5', selectionId: 'o2.5', odds: goalsData['o2.5'].payout },
      { label: 'Over 3.5', selectionId: 'o3.5', odds: goalsData['o3.5'].payout },
    ];

    const renderGoalsSection = (options: typeof underOptions, title: string, icon: string) => (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Goal className="text-green-400" />
                    <span className="font-bold text-white">{title}</span>
                </div>
            </div>
            <div className="space-y-2 flex-grow flex flex-col justify-end">
                {options.map(({ label, selectionId, odds }) => {
                    const isSelected = isOutcomeSelected('goals', selectionId);
                    const betDetails = {
                        poolType: 'goals' as const,
                        matchId: match._id,
                        matchName: `${match.teamA.name} vs ${match.teamB.name}`,
                        selectionName: `Goals: ${label}`,
                        selectionId: selectionId,
                        odds: odds
                    };
                    const isDropdownActive = showBettingOptions === `goals-${selectionId}`;

                    return (
                        <div key={selectionId} className="relative">
                            <Button
                                variant={'ghost'}
                                size="lg"
                                onClick={() => handleSelect(betDetails)}
                                className={`w-full justify-between text-base p-4 h-auto transition-all duration-200 rounded-md ${isSelected ? 'bg-blue-600/50 border border-blue-400/50' : isDropdownActive ? 'bg-gray-700' : 'bg-gray-800/50 hover:bg-gray-700/80'}`}
                            >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-300">{label}</span>
                                  {isSelected && <span className="text-blue-400 text-xs">✓ In Parlay</span>}
                                </div>
                                <span className="font-mono text-lg font-bold text-green-400">{odds.toFixed(2)}x</span>
                            </Button>
                            <BettingDropdown betDetails={betDetails} isActive={isDropdownActive} />
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderGoalsSection(underOptions, "Under Goals", "under")}
            {renderGoalsSection(overOptions, "Over Goals", "over")}
        </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Market/Alpha Row */}
      {(showMarkets.includes('market') || showMarkets.includes('alpha')) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderMarketCard('market')}
          {renderMarketCard('alpha')}
        </div>
      )}

      {/* BTTS Row */}
      {showMarkets.includes('btts') && (
        <div className="grid grid-cols-1">
          {renderBTTSCard()}
        </div>
      )}

      {/* Under/Above Goals Row */}
      {showMarkets.includes('goals') && (
        <div className="grid grid-cols-1">
          {renderGoalsCard()}
        </div>
      )}
    </div>
  );
}