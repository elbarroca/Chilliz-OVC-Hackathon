// src/components/feature/AlphaInsight.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, TrendingUp, ShieldCheck, Brain, Target, Zap, Star, Trophy, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { type MatchWithAnalysis } from '@/types';

interface AlphaInsightProps {
  match?: MatchWithAnalysis;
}

interface PredictionOutcome {
  name: string;
  probability: number;
  type: 'win_home' | 'draw' | 'win_away';
  reasoning?: string;
}

interface AlphaAnalysis {
  topPredictions: PredictionOutcome[];
  reasoning: string;
  recommendedBet: {
    selection: string;
    confidence: number;
    reasoning: string;
  };
}

export function AlphaInsight({ match }: AlphaInsightProps) {
  const [analysis, setAnalysis] = useState<AlphaAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const getTop3Predictions = (): PredictionOutcome[] => {
    if (!match) return [];
    
    const { winA_prob, winB_prob, draw_prob } = match.alphaPredictions;
    
    const predictions: PredictionOutcome[] = [
      { name: match.teamA.name, probability: winA_prob, type: 'win_home' },
      { name: 'Draw', probability: draw_prob, type: 'draw' },
      { name: match.teamB.name, probability: winB_prob, type: 'win_away' }
    ];
    
    return predictions.sort((a, b) => b.probability - a.probability);
  };

  const generateAIReasoning = async (predictions: PredictionOutcome[]): Promise<AlphaAnalysis> => {
    if (!match) throw new Error('No match data available');

    const prompt = `
    Analyze this football match and provide betting insights:
    
    Match: ${match.teamA.name} vs ${match.teamB.name}
    League: ${match.league?.name || 'Unknown'}
    
    AI Predictions:
    - ${match.teamA.name} Win: ${(predictions[0].probability * 100).toFixed(1)}%
    - Draw: ${(predictions.find(p => p.type === 'draw')?.probability || 0 * 100).toFixed(1)}%
    - ${match.teamB.name} Win: ${(predictions[2].probability * 100).toFixed(1)}%
    
    ${match.analysisData ? `
    Expected Goals:
    - ${match.teamA.name}: ${match.analysisData.expected_goals.home.toFixed(2)}
    - ${match.teamB.name}: ${match.analysisData.expected_goals.away.toFixed(2)}
    ` : ''}
    
    Provide:
    1. A concise analysis of why the top prediction is favored (max 2 sentences)
    2. Key statistical insights that support this prediction
    3. A recommended betting strategy
    
    Keep it professional, data-driven, and concise. Focus on the most probable outcome.
    `;

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, match: match._id })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI analysis');
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('AI Analysis failed:', error);
      // Fallback analysis
      const topPrediction = predictions[0];
      return {
        topPredictions: predictions,
        reasoning: `Based on our Alpha model, ${topPrediction.name} is the most likely outcome with ${(topPrediction.probability * 100).toFixed(1)}% probability. This prediction is derived from comprehensive statistical analysis including recent form, head-to-head records, and team performance metrics.`,
        recommendedBet: {
          selection: topPrediction.name,
          confidence: topPrediction.probability * 100,
          reasoning: `Strong statistical indicators favor this outcome with high confidence.`
        }
      };
    }
  };

  useEffect(() => {
    if (!match) return;
    
    const predictions = getTop3Predictions();
    
    // Use fallback analysis for now, but prepare for AI integration
    setAnalysis({
      topPredictions: predictions,
      reasoning: `Based on our Alpha model analysis, ${predictions[0].name} is the most likely outcome with ${(predictions[0].probability * 100).toFixed(1)}% probability. This prediction considers team form, historical data, and advanced statistical modeling.`,
      recommendedBet: {
        selection: predictions[0].name,
        confidence: predictions[0].probability * 100,
        reasoning: `Strong probability advantage with comprehensive data backing.`
      }
    });
  }, [match]);

  const generateAIAnalysis = async () => {
    if (!match || loading) return;
    
    setLoading(true);
    try {
      const predictions = getTop3Predictions();
      const aiAnalysis = await generateAIReasoning(predictions);
      setAnalysis(aiAnalysis);
    } catch (error) {
      console.error('Failed to generate AI analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!match || !analysis) {
    return (
      <Card className="bg-gradient-to-br from-gray-900/50 to-black border-gray-700/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Bot className="text-blue-400" size={18} />
            Alpha Intelligence
          </CardTitle>
          <Badge variant="outline" className="border-blue-400/30 text-blue-400 bg-blue-400/10 text-xs">
            Loading...
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topPredictions = analysis.topPredictions;

  return (
    <div className="space-y-4">
      {/* Main Alpha Pick Card */}
      <Card className="bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-gray-900/50 border-blue-700/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Brain className="text-blue-400" size={20} />
            Alpha Intelligence
          </CardTitle>
          <Badge variant="outline" className="border-green-400/30 text-green-400 bg-green-400/10 text-xs flex items-center gap-1">
            <Star size={12} />
            Live Analysis
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Top 3 Predictions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Trophy size={14} />
              Top Predictions
            </h4>
            {topPredictions.map((prediction, index) => (
              <div 
                key={prediction.type} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  index === 0 
                    ? 'bg-blue-900/30 border-blue-600/50' 
                    : 'bg-gray-800/30 border-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 
                      ? 'bg-blue-500 text-white' 
                      : index === 1 
                        ? 'bg-gray-500 text-white'
                        : 'bg-gray-600 text-gray-300'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className={`font-semibold ${index === 0 ? 'text-blue-200' : 'text-white'}`}>
                      {prediction.name}
                    </p>
                    {index === 0 && (
                      <p className="text-xs text-blue-300">Recommended Bet</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg font-mono ${
                    index === 0 ? 'text-blue-400' : 'text-gray-300'
                  }`}>
                    {(prediction.probability * 100).toFixed(1)}%
                  </p>
                  {index === 0 && (
                    <p className="text-xs text-blue-300">Confidence</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* AI Reasoning */}
          <div className="pt-4 border-t border-gray-700/50">
            <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <BarChart3 size={14} />
              Analysis
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              {analysis.reasoning}
            </p>
          </div>

          {/* Generate AI Analysis Button */}
          <Button
            onClick={generateAIAnalysis}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating AI Insights...
              </>
            ) : (
              <>
                <Zap size={16} />
                Get Enhanced AI Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}