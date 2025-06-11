// src/components/feature/AlphaInsight.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, TrendingUp, Target, BarChart3, Brain, Zap, Activity } from 'lucide-react';

const insights = [
    "Alpha Engine notes Team A has a 75% win rate in rainy conditions.",
    "Historical data shows this matchup has gone over 2.5 goals in 6 of the last 7 games.",
    "Team B's lead striker has a goal-per-game average of 1.2 against top-tier opponents.",
    "Weather conditions favor defensive play with 68% accuracy in similar matches.",
    "Team A's home advantage increases win probability by 12% based on historical data.",
    "Recent form analysis shows Team B has improved defensive metrics by 23%."
];

const alphaStats = [
    { label: "Model Accuracy", value: "73.5%", icon: Target, color: "text-green-400" },
    { label: "Predictions Made", value: "2,847", icon: BarChart3, color: "text-blue-400" },
    { label: "Win Rate", value: "68.2%", icon: TrendingUp, color: "text-green-400" },
    { label: "Confidence Level", value: "87%", icon: Brain, color: "text-purple-400" },
];

const recentPerformance = [
    { match: "Barcelona vs Real Madrid", prediction: "Barcelona Win", result: "✓ Correct", profit: "+240 CHZ" },
    { match: "Inter Milan vs Napoli", prediction: "Draw", result: "✓ Correct", profit: "+180 CHZ" },
    { match: "Arsenal vs Chelsea", prediction: "Arsenal Win", result: "✗ Wrong", profit: "-150 CHZ" },
    { match: "Man City vs Liverpool", prediction: "Man City Win", result: "✓ Correct", profit: "+320 CHZ" },
];

export function AlphaInsight() {
    // Select a random insight for demonstration
    const insight = insights[Math.floor(Math.random() * insights.length)];

    return (
        <div className="space-y-6">
            {/* Main Alpha Insight */}
            <Card className="bg-gradient-to-br from-[#1A1A1A] to-black border-gray-700">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Bot className="text-gray-400" size={20} />
                        Alpha Insight
                        <Badge variant="outline" className="ml-auto border-gray-600 text-gray-300">
                            <Activity size={10} className="mr-1" />
                            Live
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-lg border border-gray-700/50">
                        <p className="text-gray-200 italic leading-relaxed">&ldquo;{insight}&rdquo;</p>
                    </div>
                </CardContent>
            </Card>

            {/* Alpha Engine Stats */}
            <Card className="bg-gradient-to-br from-[#1A1A1A] to-black border-gray-700">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Zap className="text-gray-400" size={20} />
                        Alpha Engine Stats
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        {alphaStats.map((stat, index) => {
                            const IconComponent = stat.icon;
                            return (
                                <div key={index} className="p-3 bg-gradient-to-r from-gray-900/30 to-gray-800/30 rounded-lg border border-gray-700/30">
                                    <div className="flex items-center gap-2 mb-1">
                                        <IconComponent size={14} className="text-gray-400" />
                                        <span className="text-xs text-gray-400 font-medium">{stat.label}</span>
                                    </div>
                                    <div className={`text-lg font-bold ${stat.color}`}>
                                        {stat.value}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Performance */}
            <Card className="bg-gradient-to-br from-[#1A1A1A] to-black border-gray-700">
                <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                        <TrendingUp className="text-gray-400" size={20} />
                        Recent Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {recentPerformance.map((performance, index) => (
                            <div key={index} className="p-3 bg-gradient-to-r from-gray-900/30 to-gray-800/30 rounded-lg border border-gray-700/30">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-white">{performance.match}</div>
                                        <div className="text-xs text-gray-400">{performance.prediction}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs font-medium ${
                                            performance.result.includes('✓') ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {performance.result}
                                        </div>
                                        <div className={`text-xs font-mono ${
                                            performance.profit.includes('+') ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {performance.profit}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}