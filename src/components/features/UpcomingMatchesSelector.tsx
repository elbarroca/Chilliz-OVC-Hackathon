'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type Match } from '@/types';
import useSWR from 'swr';
import { Gamepad2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export interface ParlaySelection {
  matchId: string;
  matchName: string;
  selectionName: string;
  selectionId: number | string;
  odds: number;
}

interface UpcomingMatchesSelectorProps {
  onSelect: (selection: ParlaySelection) => void;
  selectedMatchIds: string[];
}

// Mock odds for now
const getMockOdds = (matchId: string) => {
    // very simple hash to get some variety
    const hash = matchId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
        home: (1.5 + (hash % 10) / 10).toFixed(2),
        draw: (3.0 + (hash % 5) / 10).toFixed(2),
        away: (4.0 + (hash % 15) / 10).toFixed(2),
    }
}

export function UpcomingMatchesSelector({ onSelect, selectedMatchIds }: UpcomingMatchesSelectorProps) {
    const { data: upcomingMatches, error, isLoading } = useSWR<Match[]>('/api/matches', fetcher);

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold flex items-center gap-4">
                <Gamepad2 />
                Build Your Parlay
            </h2>
            <p className="text-gray-400">Select an outcome from the upcoming matches below to add it to your bet slip. You can only select one outcome per match for a parlay.</p>
            {isLoading && <div>Loading matches...</div>}
            {error && <div>Failed to load upcoming matches.</div>}
            <div className="space-y-4">
                {upcomingMatches?.map(match => {
                    const odds = getMockOdds(match._id);
                    const isSelected = selectedMatchIds.includes(match._id);
                    return (
                        <Card key={match._id} className={`bg-gray-900/50 border-gray-700 transition-all ${isSelected ? 'border-blue-500' : 'hover:border-gray-600'}`}>
                            <CardContent className="p-4">
                                <p className="font-bold mb-3">{match.teamA.name} vs {match.teamB.name}</p>
                                <div className="flex flex-col md:flex-row justify-between gap-2">
                                    <Button 
                                        variant="outline" 
                                        className="flex-1 border-gray-600 justify-between group"
                                        disabled={isSelected}
                                        onClick={() => onSelect({ matchId: match._id, matchName: `${match.teamA.name} vs ${match.teamB.name}`, selectionName: match.teamA.name, selectionId: 0, odds: parseFloat(odds.home) })}
                                    >
                                        <span className="group-hover:text-white transition-colors">{match.teamA.name}</span>
                                        <span className="text-green-400 font-mono">{odds.home}x</span>
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="flex-1 border-gray-600 justify-between group"
                                        disabled={isSelected}
                                        onClick={() => onSelect({ matchId: match._id, matchName: `${match.teamA.name} vs ${match.teamB.name}`, selectionName: 'Draw', selectionId: 1, odds: parseFloat(odds.draw) })}
                                    >
                                        <span className="group-hover:text-white transition-colors">Draw</span>
                                        <span className="text-green-400 font-mono">{odds.draw}x</span>
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="flex-1 border-gray-600 justify-between group"
                                        disabled={isSelected}
                                        onClick={() => onSelect({ matchId: match._id, matchName: `${match.teamA.name} vs ${match.teamB.name}`, selectionName: match.teamB.name, selectionId: 2, odds: parseFloat(odds.away) })}
                                    >
                                        <span className="group-hover:text-white transition-colors">{match.teamB.name}</span>
                                        <span className="text-green-400 font-mono">{odds.away}x</span>
                                    </Button>
                                </div>
                                {isSelected && <p className="text-xs text-blue-400 mt-2 text-center">This match is in your parlay. Remove it from the bet slip to change selection.</p>}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    )
} 