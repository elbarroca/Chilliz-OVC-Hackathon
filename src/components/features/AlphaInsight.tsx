// src/components/feature/AlphaInsight.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const insights = [
    "Alpha Engine notes Team A has a 75% win rate in rainy conditions.",
    "Historical data shows this matchup has gone over 2.5 goals in 6 of the last 7 games.",
    "Team B's lead striker has a goal-per-game average of 1.2 against top-tier opponents."
];

export function AlphaInsight() {
    // Select a random insight for demonstration
    const insight = insights[Math.floor(Math.random() * insights.length)];

    return (
        <Card className="bg-blue-950 border-blue-700/50 mt-8">
            <CardHeader>
                <CardTitle className="text-lg text-blue-300 flex items-center gap-2">
                    🤖 Alpha Insight
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-blue-200 italic">"{insight}"</p>
            </CardContent>
        </Card>
    )
}