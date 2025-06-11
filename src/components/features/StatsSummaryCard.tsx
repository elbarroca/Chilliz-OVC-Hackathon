
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type UserStake } from '@/types';

function calculateStats(stakes: UserStake[]) {
    if (!stakes || stakes.length === 0) {
        return { totalStaked: 0, netReturn: 0, winRate: 0, roi: 0 };
    }
    const totalStaked = stakes.reduce((sum, s) => sum + s.amountStaked, 0);
    const totalReturned = stakes.reduce((sum, s) => sum + s.amountReturned, 0);
    const wonStakes = stakes.filter(s => s.status === 'WON').length;
    
    return {
        totalStaked,
        netReturn: totalReturned - totalStaked,
        winRate: (wonStakes / stakes.length) * 100,
        roi: ( (totalReturned - totalStaked) / totalStaked ) * 100 || 0
    };
}

export function StatsSummaryCard({ stakes, isLoading }: { stakes?: UserStake[], isLoading: boolean }) {
    if (isLoading) return <p>Loading stats...</p>;

    const stats = calculateStats(stakes!);

    return (
        <Card className="bg-[#1C1C1C] border-gray-800">
            <CardHeader><CardTitle>Performance Overview</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                    <p className="text-sm text-gray-400">Total Staked</p>
                    <p className="text-2xl font-bold font-mono">{stats.totalStaked.toFixed(2)} CHZ</p>
                </div>
                <div>
                    <p className="text-sm text-gray-400">Net Return</p>
                    <p className={`text-2xl font-bold font-mono ${stats.netReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.netReturn.toFixed(2)} CHZ
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-400">Win Rate</p>
                    <p className="text-2xl font-bold font-mono">{stats.winRate.toFixed(1)}%</p>
                </div>
                 <div>
                    <p className="text-sm text-gray-400">ROI</p>
                    <p className={`text-2xl font-bold font-mono ${stats.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.roi.toFixed(1)}%
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}