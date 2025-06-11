import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type UserStake } from '@/types';
import { TrendingUp, BarChart, Percent, Target } from 'lucide-react';

function calculateStats(stakes: UserStake[]) {
    if (!stakes || stakes.length === 0) {
        return { totalStaked: 0, netReturn: 0, winRate: 0, roi: 0, stakesWon: 0, stakesLost: 0 };
    }
    const totalStaked = stakes.reduce((sum, s) => sum + s.amountStaked, 0);
    const totalReturned = stakes.reduce((sum, s) => sum + s.amountReturned, 0);
    const wonStakes = stakes.filter(s => s.status === 'WON');
    const lostStakes = stakes.filter(s => s.status === 'LOST');
    
    const netReturn = totalReturned - totalStaked;

    return {
        totalStaked,
        netReturn,
        winRate: (wonStakes.length / (wonStakes.length + lostStakes.length)) * 100 || 0,
        roi: (netReturn / totalStaked) * 100 || 0,
        stakesWon: wonStakes.length,
        stakesLost: lostStakes.length,
    };
}

const StatItem = ({ icon, label, value, subValue, valueColor }: { icon: React.ReactNode, label: string, value: string, subValue?: string, valueColor?: string }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-900/50 rounded-lg">
        <div className="text-blue-400 mt-1">{icon}</div>
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className={`text-xl font-bold font-mono ${valueColor}`}>{value}</p>
            {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
        </div>
    </div>
);

export function StatsSummaryCard({ stakes, isLoading }: { stakes?: UserStake[], isLoading: boolean }) {
    if (isLoading) {
        return (
            <Card className="bg-gradient-to-br from-[#1A1A1A] to-black border-gray-800 animate-pulse">
                <CardHeader><CardTitle>Performance Overview</CardTitle></CardHeader>
                <CardContent className="h-48"></CardContent>
            </Card>
        );
    }

    const stats = calculateStats(stakes!);

    return (
        <Card className="bg-gradient-to-br from-[#1A1A1A] to-black border-gray-800">
            <CardHeader><CardTitle className="flex items-center gap-2 text-white"><BarChart size={20}/> Performance Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatItem 
                    icon={<TrendingUp />}
                    label="Net Return"
                    value={`${stats.netReturn.toFixed(2)} CHZ`}
                    valueColor={stats.netReturn >= 0 ? 'text-green-400' : 'text-red-400'}
                />
                <StatItem 
                    icon={<Percent />}
                    label="ROI"
                    value={`${stats.roi.toFixed(1)}%`}
                    valueColor={stats.roi >= 0 ? 'text-green-400' : 'text-red-400'}
                />
                <StatItem 
                    icon={<Target />}
                    label="Win Rate"
                    value={`${stats.winRate.toFixed(1)}%`}
                    subValue={`${stats.stakesWon} Won / ${stats.stakesLost} Lost`}
                />
                <StatItem 
                    icon={<BarChart />}
                    label="Total Staked"
                    value={`${stats.totalStaked.toFixed(2)} CHZ`}
                />
            </CardContent>
        </Card>
    );
}