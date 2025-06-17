'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, TrendingUp, Goal, Shield } from 'lucide-react';
import { type MatchWithAnalysis } from '@/types';

interface PredictionChartProps {
  match: MatchWithAnalysis | null;
}

const COLORS = {
  home: '#3b82f6', // Blue-500
  draw: '#64748b', // Slate-500
  away: '#ef4444', // Red-500
  yes: '#22c55e',  // Green-500
  no: '#8b5cf6',   // Violet-500
  over: '#f97316', // Orange-500
  under: '#06b6d4' // Cyan-500
};

// Reusable Card component for charts
const ChartCard = ({ title, badgeText, icon, children }: { title: string, badgeText: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border-gray-800 hover:border-gray-700/50 transition-all duration-300 h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-300">
                {icon}
                {title}
            </CardTitle>
            <Badge variant="outline" className="bg-gray-700/50 text-gray-400 border-gray-600 text-xs">
                {badgeText}
            </Badge>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
);

// Expected Goals Chart
const ExpectedGoalsChart = ({ match }: { match: MatchWithAnalysis }) => {
    if (!match.analysisData) return null;
    const data = [
        { name: match.teamA.name, xG: match.analysisData.expected_goals.home, color: COLORS.home },
        { name: match.teamB.name, xG: match.analysisData.expected_goals.away, color: COLORS.away }
    ];
    const maxVal = Math.max(...data.map(d => d.xG)) + 0.5;

    return (
        <ChartCard title="Expected Goals (xG)" badgeText="AI Prediction" icon={<Target className="w-4 h-4 text-blue-400" />}>
            <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide domain={[0, maxVal]} />
                    <YAxis type="category" dataKey="name" hide width={60} />
                    <Bar dataKey="xG" barSize={25} radius={[4, 4, 4, 4]}>
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
             <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                 {data.map((d) => (
                   <div key={d.name} className="p-3 rounded-lg bg-gray-800/50">
                     <div className="text-sm text-gray-400">{d.name}</div>
                     <div className="text-2xl font-bold" style={{ color: d.color }}>{d.xG.toFixed(2)}</div>
                   </div>
                 ))}
             </div>
        </ChartCard>
    );
};

// Match Outcome Chart
const MatchOutcomeChart = ({ match }: { match: MatchWithAnalysis }) => {
    if (!match.analysisData) return null;
    const probs = match.analysisData.match_outcome_probabilities.monte_carlo;
    const data = [
      { name: `${match.teamA.name} Win`, value: probs.home_win, color: COLORS.home },
      { name: 'Draw', value: probs.draw, color: COLORS.draw },
      { name: `${match.teamB.name} Win`, value: probs.away_win, color: COLORS.away }
    ];

    return (
         <ChartCard title="Match Outcome Probabilities" badgeText="Monte Carlo" icon={<Brain className="w-4 h-4 text-purple-400" />}>
             <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value" stroke="none">
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                </PieChart>
             </ResponsiveContainer>
             <div className="mt-4 space-y-2">
                 {data.map(d => (
                     <div key={d.name} className="flex justify-between items-center text-sm">
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                             <span className="text-gray-300">{d.name}</span>
                         </div>
                         <span className="font-mono font-bold text-white">{(d.value * 100).toFixed(1)}%</span>
                     </div>
                 ))}
             </div>
         </ChartCard>
    )
}

// Side Market Chart (BTTS, Over/Under)
const SideMarketChart = ({ title, icon, data, colors }: { title: string, icon: React.ReactNode, data: {name: string, value: number}[], colors: string[] }) => (
    <ChartCard title={title} badgeText="Market Odds" icon={icon}>
        <div className="space-y-3 pt-4">
        {data.map((d, i) => (
            <div key={d.name}>
                <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="text-gray-300">{d.name}</span>
                    <span className="font-mono font-bold text-white">{(d.value * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full" style={{ width: `${d.value * 100}%`, backgroundColor: colors[i] }}></div>
                </div>
            </div>
        ))}
        </div>
    </ChartCard>
);

export function PredictionChart({ match }: PredictionChartProps) {
  if (!match || !match.analysisData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border-gray-800 h-[240px]">
                <CardContent className="p-6 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <div className="animate-pulse w-16 h-4 bg-gray-700 rounded-md mx-auto mb-2"></div>
                        <div className="animate-pulse w-24 h-3 bg-gray-700 rounded-md mx-auto"></div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
    );
  }
  
  const bttsProbs = match.analysisData.match_outcome_probabilities.monte_carlo;
  const bttsData = [
      { name: 'Yes', value: bttsProbs.both_teams_score },
      { name: 'No', value: 1 - bttsProbs.both_teams_score }
  ];

  const overUnderProbs = match.analysisData.match_outcome_probabilities.monte_carlo;
  const overUnderData = [
      { name: 'Over 2.5', value: overUnderProbs.over_2_5_goals },
      { name: 'Under 2.5', value: 1 - overUnderProbs.over_2_5_goals }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExpectedGoalsChart match={match} />
        <MatchOutcomeChart match={match} />
        <SideMarketChart title="Both Teams to Score" icon={<Shield className="w-4 h-4 text-green-400" />} data={bttsData} colors={[COLORS.yes, COLORS.no]} />
        <SideMarketChart title="Over/Under 2.5 Goals" icon={<Goal className="w-4 h-4 text-orange-400" />} data={overUnderData} colors={[COLORS.over, COLORS.under]} />
    </div>
  );
} 