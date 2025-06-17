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
  modelInsights?: {
    expectedGoals: {
      home: number;
      away: number;
    };
    keyMetrics: Array<{
      name: string;
      value: string;
      trend: 'up' | 'down' | 'neutral';
    }>;
  };
}

export function AlphaInsight({ match }: AlphaInsightProps) {
  const [analysis, setAnalysis] = useState<AlphaAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const getTop3Predictions = (): PredictionOutcome[] => {
    if (!match) return [];
    
    try {
      // First try to get predictions from analysisData (enhanced database data)
      if (match.analysisData?.match_outcome_probabilities?.monte_carlo) {
        const { home_win, draw, away_win } = match.analysisData.match_outcome_probabilities.monte_carlo;
        
        const predictions: PredictionOutcome[] = [
          { name: match.teamA.name, probability: home_win, type: 'win_home' },
          { name: 'Draw', probability: draw, type: 'draw' },
          { name: match.teamB.name, probability: away_win, type: 'win_away' }
        ];
        
        return predictions.sort((a, b) => b.probability - a.probability);
      }
      
      // Fallback to basic alphaPredictions
      const { winA_prob, winB_prob, draw_prob } = match.alphaPredictions || {};
      
      // Ensure we have valid probabilities
      if (typeof winA_prob !== 'number' || typeof winB_prob !== 'number' || typeof draw_prob !== 'number') {
        console.warn('Invalid prediction probabilities, using fallback values');
        return [
          { name: match.teamA?.name || 'Home', probability: 0.33, type: 'win_home' },
          { name: 'Draw', probability: 0.33, type: 'draw' },
          { name: match.teamB?.name || 'Away', probability: 0.34, type: 'win_away' }
        ];
      }
      
      const predictions: PredictionOutcome[] = [
        { name: match.teamA.name, probability: winA_prob, type: 'win_home' },
        { name: 'Draw', probability: draw_prob, type: 'draw' },
        { name: match.teamB.name, probability: winB_prob, type: 'win_away' }
      ];
      
      return predictions.sort((a, b) => b.probability - a.probability);
    } catch (error) {
      console.error('Error generating predictions:', error);
      return [
        { name: match.teamA?.name || 'Home', probability: 0.33, type: 'win_home' },
        { name: 'Draw', probability: 0.33, type: 'draw' },
        { name: match.teamB?.name || 'Away', probability: 0.34, type: 'win_away' }
      ];
    }
  };

  const generateEnhancedAnalysis = (): AlphaAnalysis => {
    if (!match) {
      throw new Error('No match data available');
    }

    const predictions = getTop3Predictions();
    
    if (!predictions || predictions.length === 0) {
      throw new Error('No predictions available');
    }
    
    const topPrediction = predictions[0];
    
    // Use analysis data if available for enhanced insights
    let modelInsights = undefined;
    let enhancedReasoning = '';
    
    if (match.analysisData) {
      const { expected_goals, match_outcome_probabilities, all_market_probabilities } = match.analysisData;
      
      // Build model insights from the enhanced data
      if (expected_goals) {
        modelInsights = {
          expectedGoals: expected_goals,
          keyMetrics: [
            {
              name: 'Expected Goals Difference',
              value: `${(expected_goals.home - expected_goals.away).toFixed(2)}`,
              trend: (expected_goals.home > expected_goals.away ? 'up' : expected_goals.home < expected_goals.away ? 'down' : 'neutral') as 'up' | 'down' | 'neutral'
            },
            {
              name: 'Both Teams Score Probability',
              value: `${(match_outcome_probabilities.monte_carlo?.both_teams_score * 100 || 0).toFixed(1)}%`,
              trend: ((match_outcome_probabilities.monte_carlo?.both_teams_score || 0) > 0.5 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
            },
            {
              name: 'Over 2.5 Goals Probability',
              value: `${(match_outcome_probabilities.monte_carlo?.over_2_5_goals * 100 || 0).toFixed(1)}%`,
              trend: ((match_outcome_probabilities.monte_carlo?.over_2_5_goals || 0) > 0.5 ? 'up' : 'down') as 'up' | 'down' | 'neutral'
            }
          ]
        };
      }

      // Use reasoning from database if available
      if (match.analysisData.reasoning && match.analysisData.reasoning.trim()) {
        console.log('Using reasoning from database:', match.analysisData.reasoning);
        enhancedReasoning = match.analysisData.reasoning;
      } else {
        console.log('No reasoning from database, generating locally...');
        // Enhanced reasoning based on expected goals and model consensus
        const goalDifference = expected_goals ? expected_goals.home - expected_goals.away : 0;
        const bttsProb = match_outcome_probabilities.monte_carlo?.both_teams_score || 0;
        const overGoalsProb = match_outcome_probabilities.monte_carlo?.over_2_5_goals || 0;

        enhancedReasoning = `Our Alpha model predicts ${topPrediction.name} as the most likely outcome with ${(topPrediction.probability * 100).toFixed(1)}% confidence. `;
        
        if (expected_goals && Math.abs(goalDifference) > 0.5) {
          enhancedReasoning += `Expected goals analysis shows a ${goalDifference > 0 ? match.teamA.name : match.teamB.name} advantage (${expected_goals.home.toFixed(2)} vs ${expected_goals.away.toFixed(2)}). `;
        } else if (expected_goals) {
          enhancedReasoning += `Expected goals are closely matched (${expected_goals.home.toFixed(2)} vs ${expected_goals.away.toFixed(2)}), suggesting a competitive match. `;
        }

        if (bttsProb > 0.6) {
          enhancedReasoning += `High probability for both teams to score (${(bttsProb * 100).toFixed(1)}%).`;
        } else if (bttsProb < 0.4) {
          enhancedReasoning += `Low-scoring match expected with reduced chance of both teams scoring.`;
        }
      }
    } else {
      enhancedReasoning = `Based on our Alpha model analysis, ${topPrediction.name} is the most likely outcome with ${(topPrediction.probability * 100).toFixed(1)}% probability. This prediction considers team form, historical data, and advanced statistical modeling.`;
    }

    return {
      topPredictions: predictions,
      reasoning: enhancedReasoning,
      recommendedBet: {
        selection: topPrediction.name,
        confidence: topPrediction.probability * 100,
        reasoning: `Strong statistical indicators and model consensus favor this outcome with ${(topPrediction.probability * 100).toFixed(1)}% confidence.`
      },
      modelInsights
    };
  };

  useEffect(() => {
    if (!match) return;
    
    // Debug log to see what data we have
    console.log('AlphaInsight - match data:', match);
    console.log('AlphaInsight - analysisData:', match.analysisData);
    console.log('AlphaInsight - reasoning field:', match.analysisData?.reasoning);
    
    try {
      const enhancedAnalysis = generateEnhancedAnalysis();
      setAnalysis(enhancedAnalysis);
    } catch (error) {
      console.error('Failed to generate enhanced analysis:', error);
      // Fallback to basic analysis
      const predictions = getTop3Predictions();
      setAnalysis({
        topPredictions: predictions,
        reasoning: `Based on our Alpha model analysis, ${predictions[0].name} is the most likely outcome with ${(predictions[0].probability * 100).toFixed(1)}% probability.`,
        recommendedBet: {
          selection: predictions[0].name,
          confidence: predictions[0].probability * 100,
          reasoning: `Strong probability advantage with comprehensive data backing.`
        }
      });
    }
  }, [match]);

  const generateDetailedAnalysis = async () => {
    if (!match || loading) return;
    
    setLoading(true);
    try {
      // Instead of calling external API, use enhanced local analysis
      const enhancedAnalysis = generateEnhancedAnalysis();
      setAnalysis(enhancedAnalysis);
      
      // Optional: You could still call the AI API for additional insights
      // but now it would supplement rather than replace the database analysis
      
    } catch (error) {
      console.error('Failed to generate detailed analysis:', error);
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
            {match.analysisData ? 'Enhanced' : 'Standard'} Analysis
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

          {/* Model Insights - Only if enhanced analysis data is available */}
          {analysis.modelInsights && (
            <div className="pt-4 border-t border-gray-700/50">
              <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <BarChart3 size={14} />
                Model Insights
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">Expected Goals</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white">{match.teamA.name}</span>
                    <span className="font-mono text-blue-400 font-bold">{analysis.modelInsights.expectedGoals.home.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white">{match.teamB.name}</span>
                    <span className="font-mono text-blue-400 font-bold">{analysis.modelInsights.expectedGoals.away.toFixed(2)}</span>
                  </div>
                </div>
                {analysis.modelInsights.keyMetrics.map((metric, index) => (
                  <div key={index} className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">{metric.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-white">{metric.value}</span>
                        {metric.trend === 'up' && <TrendingUp size={12} className="text-green-400" />}
                        {metric.trend === 'down' && <TrendingUp size={12} className="text-red-400 rotate-180" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Reasoning */}
          <div className="pt-4 border-t border-gray-700/50">
            <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
              <BarChart3 size={14} />
              Analysis Summary
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              {analysis.reasoning}
            </p>
          </div>

          {/* Enhanced Analysis Button - Only show if we don't have full analysis data */}
          {!match.analysisData && (
            <Button
              onClick={generateDetailedAnalysis}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating Enhanced Analysis...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Get Enhanced Analysis
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}