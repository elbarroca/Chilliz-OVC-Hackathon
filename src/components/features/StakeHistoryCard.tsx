import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type UserStake } from '@/types';
import { Calendar, TrendingUp, TrendingDown, Clock, Zap, Users, ArrowRight, Target, Flame } from 'lucide-react';

export function StakeHistoryCard({ stake }: { stake: UserStake }) {
  const stakeDate = new Date(stake.stakeTime);
  const profit = stake.amountReturned - stake.amountStaked;
  const profitPercentage = stake.amountStaked > 0 ? ((profit / stake.amountStaked) * 100) : 0;
  const isPending = stake.status === 'PENDING';

  const getStatusBadge = () => {
    switch (stake.status) {
      case 'WON':
        return (
          <Badge className="bg-green-900/80 text-green-300 border-green-700 flex items-center gap-1.5 px-3 py-1">
            <TrendingUp size={14} />
            Won
          </Badge>
        );
      case 'LOST':
        return (
          <Badge className="bg-red-900/80 text-red-300 border-red-700 flex items-center gap-1.5 px-3 py-1">
            <TrendingDown size={14} />
            Lost
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white border-0 flex items-center gap-1.5 px-4 py-2 font-bold animate-pulse">
            <Flame size={14} />
            LIVE STAKE
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPoolBadge = () => {
    return stake.poolType === 'Alpha' ? (
      <Badge variant="outline" className="bg-gray-900/50 text-gray-300 border-gray-600 flex items-center gap-1.5 px-3 py-1">
        <Zap size={12} />
        Alpha Pool
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-gray-900/50 text-gray-300 border-gray-600 flex items-center gap-1.5 px-3 py-1">
        <Users size={12} />
        Market Pool
      </Badge>
    );
  };

  // Enhanced styling for pending stakes
  const cardClasses = isPending 
    ? "relative bg-gradient-to-br from-yellow-900/20 via-orange-900/20 to-red-900/20 border-yellow-500/50 group-hover:border-yellow-400/70 transition-all duration-300 overflow-hidden shadow-lg shadow-yellow-500/10"
    : "relative bg-gradient-to-br from-[#1A1A1A] to-black border-gray-800 group-hover:border-gray-700 transition-all duration-300 overflow-hidden";

  const gradientBorderClasses = isPending
    ? "absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"
    : "absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500";

  return (
    <Link href={`/${stake.match._id}`} className="block group">
      <div className="relative">
        {/* Enhanced gradient border effect */}
        <div className={gradientBorderClasses}></div>
        
        {/* Live stake glow effect */}
        {isPending && (
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-xl blur-lg animate-pulse"></div>
        )}
        
        <Card className={cardClasses}>
          {/* Live stake indicator */}
          {isPending && (
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400"></div>
          )}
          
          <CardContent className="p-6">
            {/* Header Section */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* Team Logos */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={stake.match.teamA.logoUrl} 
                      alt={stake.match.teamA.name} 
                      className={`w-10 h-10 rounded-full border-2 transition-colors ${
                        isPending 
                          ? 'border-yellow-500/70 group-hover:border-yellow-400' 
                          : 'border-gray-700 group-hover:border-gray-600'
                      }`}
                    />
                    {isPending && (
                      <div className="absolute -inset-1 bg-yellow-400/20 rounded-full blur animate-pulse"></div>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${isPending ? 'text-yellow-400' : 'text-gray-500'}`}>VS</span>
                  <div className="relative">
                    <img 
                      src={stake.match.teamB.logoUrl} 
                      alt={stake.match.teamB.name} 
                      className={`w-10 h-10 rounded-full border-2 transition-colors ${
                        isPending 
                          ? 'border-yellow-500/70 group-hover:border-yellow-400' 
                          : 'border-gray-700 group-hover:border-gray-600'
                      }`}
                    />
                    {isPending && (
                      <div className="absolute -inset-1 bg-yellow-400/20 rounded-full blur animate-pulse"></div>
                    )}
                  </div>
                </div>
                
                {/* Match Info */}
                <div>
                  <h3 className={`font-bold group-hover:text-gray-200 transition-colors text-lg ${
                    isPending ? 'text-yellow-100' : 'text-white'
                  }`}>
                    {stake.match.teamA.name} vs {stake.match.teamB.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Calendar size={12} />
                      <time className="text-xs font-medium">
                        {stakeDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Target size={12} />
                      <span className={`text-xs font-medium ${isPending ? 'text-yellow-300' : ''}`}>
                        {stake.prediction}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Status Badges */}
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge()}
                {getPoolBadge()}
              </div>
            </div>

            {/* Stats Grid */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-xl border ${
              isPending 
                ? 'bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-700/50' 
                : 'bg-gradient-to-r from-gray-900/40 to-gray-800/40 border-gray-700/50'
            }`}>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Staked</p>
                <p className={`font-mono font-bold text-lg ${isPending ? 'text-yellow-100' : 'text-white'}`}>
                  {stake.amountStaked.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">CHZ</p>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
                  {stake.status === 'PENDING' ? 'Potential' : 'Returned'}
                </p>
                <p className={`font-mono font-bold text-lg ${isPending ? 'text-yellow-100' : 'text-white'}`}>
                  {stake.status === 'PENDING' ? '—' : stake.amountReturned.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">CHZ</p>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Profit/Loss</p>
                {stake.status === 'PENDING' ? (
                  <div>
                    <p className="font-mono font-bold text-yellow-300 text-lg">Pending</p>
                    <p className="text-xs text-gray-500">—</p>
                  </div>
                ) : (
                  <div>
                    <p className={`font-mono font-bold text-lg ${
                      profit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                    </p>
                    <p className={`text-xs font-medium ${
                      profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Multiplier</p>
                <p className={`font-mono font-bold text-lg ${isPending ? 'text-yellow-100' : 'text-white'}`}>
                  {stake.status === 'PENDING' ? '—' : 
                   stake.amountStaked > 0 ? (stake.amountReturned / stake.amountStaked).toFixed(2) : '0.00'}
                </p>
                <p className="text-xs text-gray-500">x</p>
              </div>
            </div>

            {/* Hover Action */}
            <div className="mt-5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <p className={`text-sm font-medium ${isPending ? 'text-yellow-300' : 'text-gray-400'}`}>
                {isPending ? 'Monitor live match progress' : 'View match details & analysis'}
              </p>
              <div className={`flex items-center gap-2 transition-colors ${
                isPending 
                  ? 'text-yellow-400 group-hover:text-yellow-300' 
                  : 'text-gray-400 group-hover:text-white'
              }`}>
                <span className="text-sm font-medium">
                  {isPending ? 'Watch Live' : 'View Match'}
                </span>
                <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  );
}