'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, X } from 'lucide-react';
import { type ParlaySelectionDetails } from './StakingInterface';

interface ParlayBuilderProps {
  selections: ParlaySelectionDetails[];
  onRemove: (matchId: string) => void;
  onClear: () => void;
  onPlaceBet: (amount: number) => void;
  isInsideSheet?: boolean;
}

export function ParlayBuilder({ selections, onRemove, onClear, onPlaceBet, isInsideSheet = false }: ParlayBuilderProps) {
  const [stakeAmount, setStakeAmount] = useState('');

  const totalOdds = selections.reduce((acc, bet) => acc * bet.odds, 1);
  const potentialWinnings = totalOdds * parseFloat(stakeAmount || '0');

  const CardComponent = isInsideSheet ? 'div' : Card;

  return (
    <CardComponent className={!isInsideSheet ? "bg-gradient-to-br from-gray-900/50 to-black border-gray-700 sticky top-28" : "flex flex-col h-full"}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
            <Link2 size={20} />
            Parlay Bet Slip
        </CardTitle>
        {selections.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear}>Clear All</Button>
        )}
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        {selections.length > 0 ? (
          <div className="space-y-3">
            {selections.map((selection, index) => (
              <div key={selection.matchId} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-blue-400 bg-blue-400/20 px-2 py-1 rounded-full">
                        {index + 1}
                      </span>
                      <p className="font-bold text-sm text-white">{selection.matchName}</p>
                    </div>
                    <p className="text-sm text-gray-300 ml-6">{selection.selectionName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <p className="font-mono text-green-400 font-bold">{selection.odds.toFixed(2)}x</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-500 transition-colors" onClick={() => onRemove(selection.matchId)}>
                          <X className="h-4 w-4" />
                      </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <div className="mb-4">
              <Link2 size={48} className="mx-auto mb-3 text-gray-600" />
            </div>
            <p className="font-medium mb-2">Your bet slip is empty</p>
            <p className="text-sm">Select outcomes from matches to build your parlay</p>
          </div>
        )}
      </CardContent>
      {selections.length > 0 && (
        <CardFooter className="flex-col items-stretch space-y-4 pt-4 border-t border-gray-700">
             <div className="flex justify-between font-bold text-lg">
                <p>Total Odds</p>
                <p className="font-mono text-green-400">{totalOdds.toFixed(2)}x</p>
            </div>
            <div>
                <Input 
                    type="number" 
                    placeholder="Stake Amount (CHZ)" 
                    className="bg-gray-800 border-gray-600 text-white font-mono" 
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                />
            </div>
            {potentialWinnings > 0 && (
                <div className="flex justify-between text-sm">
                    <p className="text-gray-400">Potential Winnings</p>
                    <p className="font-mono text-green-400">{potentialWinnings.toFixed(2)} CHZ</p>
                </div>
            )}
            <Button 
                className="w-full bg-white text-black font-bold" 
                disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
                onClick={() => onPlaceBet(parseFloat(stakeAmount))}
            >
                Place Parlay Bet
            </Button>
        </CardFooter>
      )}
    </CardComponent>
  );
} 