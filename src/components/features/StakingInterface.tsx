'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { contractAddress, contractAbi } from '@/lib/contants'; // Your contract constants
import { Match } from '@/types';
import { Heart, Bot, TrendingUp, Users, Zap, DollarSign } from 'lucide-react';

// Mock pool data - in real app this would come from on-chain reads
const MOCK_POOL_DATA = {
  market: { 
    total: 1500, 
    teamA: { payout: 1.85, staked: 800 },
    draw: { payout: 3.20, staked: 300 },
    teamB: { payout: 4.50, staked: 400 }
  },
  alpha: { 
    total: 850, 
    teamA: { payout: 1.65, staked: 500 },
    draw: { payout: 3.80, staked: 150 },
    teamB: { payout: 5.10, staked: 200 }
  },
};

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolType: 'market' | 'alpha';
  outcome: string;
  payout: number;
  onConfirm: (amount: string) => void;
}

function StakeModal({ isOpen, onClose, poolType, outcome, payout, onConfirm }: StakeModalProps) {
  const [amount, setAmount] = useState('');
  
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (amount && parseFloat(amount) > 0) {
      onConfirm(amount);
      setAmount('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-[#1A1A1A] to-black border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {poolType === 'market' ? <Heart className="text-red-400" size={20} /> : <Bot className="text-gray-400" size={20} />}
            Confirm Stake
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Pool Type</div>
            <div className="font-bold text-white capitalize">{poolType} Pool</div>
          </div>
          
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Prediction</div>
            <div className="font-bold text-white">{outcome}</div>
          </div>
          
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Payout Multiplier</div>
            <div className="font-bold text-green-400">{payout}x</div>
          </div>
          
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Stake Amount</label>
            <Input 
              type="number"
              placeholder="0.0 CHZ"
              className="bg-gray-900 border-gray-700 text-white font-mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          
          {amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Potential Return</div>
              <div className="font-bold text-green-400">
                {(parseFloat(amount) * payout).toFixed(2)} CHZ
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!amount || parseFloat(amount) <= 0}
              className="flex-1 bg-white text-black font-bold hover:bg-gray-200"
            >
              Confirm Stake
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StakingInterface({ match }: { match: Match }) {
  const { address } = useAccount();
  const { writeContract, error } = useWriteContract();
  const [stakeModal, setStakeModal] = useState<{
    isOpen: boolean;
    poolType: 'market' | 'alpha';
    outcome: string;
    outcomeId: number;
    payout: number;
  }>({
    isOpen: false,
    poolType: 'market',
    outcome: '',
    outcomeId: 0,
    payout: 0
  });

  const handleStakeClick = (poolType: 'market' | 'alpha', outcome: string, outcomeId: number, payout: number) => {
    if (!address) {
      alert("Please connect your wallet first.");
      return;
    }
    
    setStakeModal({
      isOpen: true,
      poolType,
      outcome,
      outcomeId,
      payout
    });
  };

  const handleConfirmStake = (amount: string) => {
    writeContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'stake',
      args: [
        match.matchId,
        stakeModal.outcomeId,
        stakeModal.poolType === 'alpha', // isAlphaPool boolean
      ],
      value: parseEther(amount),
    });

    if (error) {
      console.error("Stake failed:", error.message);
      alert(`Stake failed: ${error.message}`);
    }
  };

  const outcomes = [
    { name: match.teamA.name, outcomeId: 0 },
    { name: 'Draw', outcomeId: 1 },
    { name: match.teamB.name, outcomeId: 2 },
  ];

  return (
    <div className="space-y-8">
      {/* Market Pool Card */}
      <Card className="bg-gradient-to-br from-[#1A1A1A] to-black border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Heart className="text-red-400" size={24} />
            <div>
              <div className="text-xl font-bold text-white">Market Pool</div>
              <div className="text-sm text-gray-400">Community-driven predictions</div>
            </div>
            <Badge variant="outline" className="ml-auto border-gray-600 text-gray-300">
              <Users size={12} className="mr-1" />
              {MOCK_POOL_DATA.market.total} CHZ
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {outcomes.map(({ name, outcomeId }) => {
            const data = outcomeId === 0 ? MOCK_POOL_DATA.market.teamA : 
                         outcomeId === 1 ? MOCK_POOL_DATA.market.draw : 
                         MOCK_POOL_DATA.market.teamB;
            
            return (
              <div key={name} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors group">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-bold text-white text-lg">{name}</div>
                    <div className="text-sm text-gray-400">{data.staked} CHZ staked</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono font-bold text-green-400 text-lg">{data.payout}x</div>
                    <div className="text-xs text-gray-400">Payout</div>
                  </div>
                  <Button 
                    onClick={() => handleStakeClick('market', name, outcomeId, data.payout)}
                    className="bg-white text-black font-bold hover:bg-gray-200 px-6"
                  >
                    Stake
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Alpha Pool Card */}
      <Card className="bg-gradient-to-br from-[#1A1A1A] to-black border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Bot className="text-gray-400" size={24} />
            <div>
              <div className="text-xl font-bold text-white">Alpha Pool</div>
              <div className="text-sm text-gray-400">AI-powered predictions</div>
            </div>
            <Badge variant="outline" className="ml-auto border-gray-600 text-gray-300">
              <Zap size={12} className="mr-1" />
              {MOCK_POOL_DATA.alpha.total} CHZ
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {outcomes.map(({ name, outcomeId }) => {
            const data = outcomeId === 0 ? MOCK_POOL_DATA.alpha.teamA : 
                         outcomeId === 1 ? MOCK_POOL_DATA.alpha.draw : 
                         MOCK_POOL_DATA.alpha.teamB;
            
            return (
              <div key={name} className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors group">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-bold text-white text-lg">{name}</div>
                    <div className="text-sm text-gray-400">{data.staked} CHZ staked</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono font-bold text-green-400 text-lg">{data.payout}x</div>
                    <div className="text-xs text-gray-400">Payout</div>
                  </div>
                  <Button 
                    onClick={() => handleStakeClick('alpha', name, outcomeId, data.payout)}
                    className="bg-white text-black font-bold hover:bg-gray-200 px-6"
                  >
                    Stake
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Live Payout Multipliers Card */}
      <Card className="bg-gradient-to-br from-[#1A1A1A] to-black border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <TrendingUp className="text-gray-400" size={24} />
            <div>
              <div className="text-xl font-bold text-white">Live Payout Multipliers</div>
              <div className="text-sm text-gray-400">Real-time odds comparison</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Market Pool Multipliers */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={16} className="text-red-400" />
                <span className="font-bold text-white">Market Pool</span>
              </div>
              {outcomes.map(({ name, outcomeId }) => {
                const data = outcomeId === 0 ? MOCK_POOL_DATA.market.teamA : 
                             outcomeId === 1 ? MOCK_POOL_DATA.market.draw : 
                             MOCK_POOL_DATA.market.teamB;
                
                return (
                  <div key={`market-${name}`} className="flex justify-between items-center p-3 bg-gray-900/30 rounded-lg">
                    <span className="text-white font-medium">{name}</span>
                    <span className="font-mono font-bold text-green-400">{data.payout}x</span>
                  </div>
                );
              })}
            </div>

            {/* Alpha Pool Multipliers */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={16} className="text-gray-400" />
                <span className="font-bold text-white">Alpha Pool</span>
              </div>
              {outcomes.map(({ name, outcomeId }) => {
                const data = outcomeId === 0 ? MOCK_POOL_DATA.alpha.teamA : 
                             outcomeId === 1 ? MOCK_POOL_DATA.alpha.draw : 
                             MOCK_POOL_DATA.alpha.teamB;
                
                return (
                  <div key={`alpha-${name}`} className="flex justify-between items-center p-3 bg-gray-900/30 rounded-lg">
                    <span className="text-white font-medium">{name}</span>
                    <span className="font-mono font-bold text-green-400">{data.payout}x</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stake Modal */}
      <StakeModal
        isOpen={stakeModal.isOpen}
        onClose={() => setStakeModal(prev => ({ ...prev, isOpen: false }))}
        poolType={stakeModal.poolType}
        outcome={stakeModal.outcome}
        payout={stakeModal.payout}
        onConfirm={handleConfirmStake}
      />
    </div>
  );
}