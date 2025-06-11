import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type UserStake } from '@/types';
import { TrendingUp, BarChart, Percent, Target, Trophy, Zap } from 'lucide-react';

interface StatsSummaryCardProps {
  stakes?: UserStake[];
  isLoading: boolean;
}

export function StatsSummaryCard({ stakes, isLoading }: StatsSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart size={20} />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Skeleton Loader */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-6 bg-gray-600 rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!stakes || !Array.isArray(stakes) || stakes.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart size={20} />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <Trophy size={48} className="mx-auto mb-4 opacity-50" />
            <p>No stakes yet</p>
            <p className="text-sm">Your performance stats will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const totalStaked = stakes.reduce((sum, stake) => sum + stake.amountStaked, 0);
  const totalReturned = stakes.reduce((sum, stake) => sum + stake.amountReturned, 0);
  const netReturn = totalReturned - totalStaked;
  const roi = totalStaked > 0 ? ((netReturn / totalStaked) * 100) : 0;
  
  const wonStakes = stakes.filter(stake => stake.status === 'WON');
  const lostStakes = stakes.filter(stake => stake.status === 'LOST');
  const pendingStakes = stakes.filter(stake => stake.status === 'PENDING');
  
  const winRate = stakes.length > 0 ? ((wonStakes.length / (wonStakes.length + lostStakes.length)) * 100) : 0;
  
  const alphaStakes = stakes.filter(stake => stake.poolType === 'Alpha');
  const marketStakes = stakes.filter(stake => stake.poolType === 'Market');
  
  const alphaWinRate = alphaStakes.length > 0 ? 
    ((alphaStakes.filter(s => s.status === 'WON').length / alphaStakes.filter(s => s.status !== 'PENDING').length) * 100) : 0;
  const marketWinRate = marketStakes.length > 0 ? 
    ((marketStakes.filter(s => s.status === 'WON').length / marketStakes.filter(s => s.status !== 'PENDING').length) * 100) : 0;

  const StatItem = ({ icon: Icon, label, value, subValue, color = "text-white" }: {
    icon: any;
    label: string;
    value: string;
    subValue?: string;
    color?: string;
  }) => (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/50 border border-gray-700/50">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-800/50">
          <Icon size={16} className="text-gray-400" />
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );

  return (
    <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BarChart size={20} />
          Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatItem
          icon={TrendingUp}
          label="Net Return"
          value={`${netReturn >= 0 ? '+' : ''}${netReturn.toFixed(2)} CHZ`}
          color={netReturn >= 0 ? "text-green-400" : "text-red-400"}
        />
        
        <StatItem
          icon={Percent}
          label="ROI"
          value={`${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`}
          color={roi >= 0 ? "text-green-400" : "text-red-400"}
        />
        
        <StatItem
          icon={Target}
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          subValue={`${wonStakes.length} Won / ${lostStakes.length} Lost`}
        />
        
        <StatItem
          icon={BarChart}
          label="Total Staked"
          value={`${totalStaked.toFixed(2)} CHZ`}
          subValue={`${stakes.length} total stakes`}
        />

        {pendingStakes.length > 0 && (
          <StatItem
            icon={Trophy}
            label="Pending Stakes"
            value={`${pendingStakes.length}`}
            subValue={`${pendingStakes.reduce((sum, stake) => sum + stake.amountStaked, 0).toFixed(2)} CHZ at risk`}
            color="text-yellow-400"
          />
        )}

        {/* Pool Performance Comparison */}
        {alphaStakes.length > 0 && marketStakes.length > 0 && (
          <div className="pt-4 border-t border-gray-700/50">
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Zap size={14} />
              Pool Performance
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-gray-800/50 border border-gray-600">
                <p className="text-xs text-gray-300 mb-1">Alpha Pool</p>
                <p className="font-bold text-white">{alphaWinRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-400">{alphaStakes.length} stakes</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-800/50 border border-gray-600">
                <p className="text-xs text-gray-300 mb-1">Market Pool</p>
                <p className="font-bold text-white">{marketWinRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-400">{marketStakes.length} stakes</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}