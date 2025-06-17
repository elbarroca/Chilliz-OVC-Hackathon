'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ParlayBuilder } from './ParlayBuilder';
import { type ParlaySelectionDetails } from './StakingInterface';
import { Link2, Layers, ShoppingCart } from 'lucide-react';

interface FloatingParlayProps {
  selections: ParlaySelectionDetails[];
  onRemove: (matchId: string) => void;
  onClear: () => void;
  onPlaceBet: (amount: number) => void;
}

export function FloatingParlay({ selections, onRemove, onClear, onPlaceBet }: FloatingParlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Always render if we have selections
  if (!selections || selections.length === 0) {
    return null;
  }

  const totalOdds = selections.reduce((acc, bet) => acc * bet.odds, 1);

  const handlePlaceBet = (amount: number) => {
    onPlaceBet(amount);
    setIsOpen(false); // Close sheet after placing bet
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-2xl transition-all duration-300 hover:scale-110 group relative animate-pulse"
            aria-label="Open Parlay Bet Slip"
          >
            <div className="flex flex-col items-center justify-center">
                <div className="relative">
                    <ShoppingCart size={24} />
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white border-2 border-white animate-bounce">
                        {selections.length}
                    </span>
                </div>
            </div>
            
            {/* Glowing effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 opacity-20 group-hover:opacity-40 blur-xl transition-opacity duration-300"></div>
            
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-30"></div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              {selections.length} bet{selections.length !== 1 ? 's' : ''} • {totalOdds.toFixed(2)}x odds
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </Button>
        </SheetTrigger>
        <SheetContent className="bg-[#0A0A0A] border-gray-800 text-white w-full sm:max-w-md">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-white flex items-center gap-2">
              <ShoppingCart size={20} />
              Parlay Bet Slip ({selections.length})
            </SheetTitle>
          </SheetHeader>
          <ParlayBuilder
            selections={selections}
            onRemove={onRemove}
            onClear={onClear}
            onPlaceBet={handlePlaceBet}
            isInsideSheet
          />
        </SheetContent>
      </Sheet>
    </div>
  );
} 