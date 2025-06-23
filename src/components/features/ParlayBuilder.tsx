'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, X } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { type ParlaySelectionDetails } from './StakingInterface';

interface ParlayBuilderProps {
  selections: ParlaySelectionDetails[];
  onRemove: (selectionId: string) => void;
  onClear: () => void;
  onPlaceBet: (amount: number) => void;
  isInsideSheet?: boolean;
}

export function ParlayBuilder({ selections, onRemove, onClear, onPlaceBet, isInsideSheet = false }: ParlayBuilderProps) {
  const [stakeAmount, setStakeAmount] = useState('');
  const { isConnected, address } = useAccount();
  const { data: balance } = useBalance({ address });
  const { openConnectModal } = useConnectModal();

  const totalOdds = selections.reduce((acc, bet) => acc * bet.odds, 1);
  const potentialWinnings = totalOdds * parseFloat(stakeAmount || '0');

  const CardComponent = isInsideSheet ? 'div' : Card;

  const handlePlaceBetClick = () => {
    if (isConnected) {
      onPlaceBet(parseFloat(stakeAmount));
    } else {
      openConnectModal?.();
    }
  };

  return (
    <CardComponent className={!isInsideSheet ? "bg-[#0A0A0A] border border-gray-800 rounded-xl" : "flex flex-col h-full"}>
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <CardTitle className="flex items-center gap-2 text-white text-lg font-bold">
            Parlay Bet Slip
        </CardTitle>
        {selections.length > 0 && (
            <Button variant="link" size="sm" onClick={onClear} className="text-gray-400 hover:text-white">Clear All</Button>
        )}
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-4">
        {selections.length > 0 ? (
          <div className="space-y-3">
            {selections.map((selection, index) => (
              <div key={selection.selectionId} className="bg-[#1C1C1E] p-4 rounded-lg border border-gray-700/50">
                <div className="flex justify-between items-center">
                  <div className="flex-1 flex items-center gap-3">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-xs font-bold text-white shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-white">{selection.matchName}</p>
                      <p className="text-sm text-gray-400">{selection.selectionName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                      <p className="font-mono text-green-400 font-bold text-lg">{selection.odds.toFixed(2)}x</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-500 transition-colors" onClick={() => onRemove(selection.selectionId)}>
                          <X className="h-4 w-4" />
                      </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <Link2 size={48} className="mx-auto mb-3 text-gray-700" />
            </div>
            <p className="font-medium mb-2 text-gray-400">Your bet slip is empty</p>
            <p className="text-sm">Select outcomes from matches to build your parlay</p>
          </div>
        )}
      </CardContent>
      {selections.length > 0 && (
        <CardFooter className="flex-col items-stretch space-y-4 p-4 border-t border-gray-800 bg-[#141414] rounded-b-xl">
             <div className="flex justify-between font-bold text-lg">
                <p className="text-gray-300">Total Odds</p>
                <p className="font-mono text-green-400">{totalOdds.toFixed(2)}x</p>
            </div>
            <div>
              <div className="relative">
                <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="bg-gray-800 border-gray-600 text-white font-mono h-12 text-base pl-28 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-blue-500" 
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">Stake Amount</span>
              </div>
              {isConnected && balance && (
                <button 
                  onClick={() => setStakeAmount(balance.formatted)}
                  className="text-xs text-gray-400 hover:text-white transition-colors mt-1.5 w-full text-right"
                >
                  Balance: {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                </button>
              )}
            </div>
            {potentialWinnings > 0 && (
                <div className="flex justify-between text-sm">
                    <p className="text-gray-300">Potential Winnings</p>
                    <p className="font-mono font-semibold text-green-400">{potentialWinnings.toFixed(2)} CHZ</p>
                </div>
            )}
            <Button 
                className="w-full bg-white text-black font-bold hover:bg-gray-200 h-12 text-base" 
                disabled={isConnected && (!stakeAmount || parseFloat(stakeAmount) <= 0)}
                onClick={handlePlaceBetClick}
            >
                {isConnected ? 'Place Parlay Bet' : 'Connect Wallet to Bet'}
            </Button>
        </CardFooter>
      )}
    </CardComponent>
  );
} 