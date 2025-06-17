'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Brain } from 'lucide-react';
import { type AlphaAnalysis } from '@/types';

interface PredictionChartProps {
  alphaAnalysis: AlphaAnalysis;
  teamAName: string;
  teamBName: string;
}

// Define colors for our charts
const COLORS = ['#3b82f6', '#64748b', '#ef4444']; // Blue for Home, Slate for Draw, Red for Away
const PIE_COLORS = ['#3b82f6', '#64748b', '#ef4444'];

export function PredictionChart({ alphaAnalysis, teamAName, teamBName }: PredictionChartProps) {
  // Transform the data for bar chart
  const barChartData = alphaAnalysis.matchOutcomeChart.categories.map((category, index) => ({
    name: category,
    value: alphaAnalysis.matchOutcomeChart.series[0].data[index] * 100,
    fullName: category === 'Home Win' ? `${teamAName} Win` : 
              category === 'Away Win' ? `${teamBName} Win` : 'Draw'
  }));

  // Transform the data for pie chart
  const pieChartData = alphaAnalysis.matchOutcomeChart.categories.map((category, index) => ({
    name: category === 'Home Win' ? teamAName : 
          category === 'Away Win' ? teamBName : 'Draw',
    value: alphaAnalysis.matchOutcomeChart.series[0].data[index] * 100,
    color: COLORS[index]
  }));

  // Model comparison data if available
  const modelComparisonData = alphaAnalysis.modelComparison ? [
    {
      model: 'Monte Carlo',
      home: alphaAnalysis.modelComparison.monte_carlo.home * 100,
      draw: alphaAnalysis.modelComparison.monte_carlo.draw * 100,
      away: alphaAnalysis.modelComparison.monte_carlo.away * 100,
    },
    {
      model: 'XGBoost',
      home: alphaAnalysis.modelComparison.xgboost.home * 100,
      draw: alphaAnalysis.modelComparison.xgboost.draw * 100,
      away: alphaAnalysis.modelComparison.xgboost.away * 100,
    },
    {
      model: 'Neural Network',
      home: alphaAnalysis.modelComparison.neural_network.home * 100,
      draw: alphaAnalysis.modelComparison.neural_network.draw * 100,
      away: alphaAnalysis.modelComparison.neural_network.away * 100,
    }
  ] : null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium">{label}</p>
          <p className="text-blue-400">
            Probability: <span className="font-bold">{payload[0].value.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium">{payload[0].name}</p>
          <p className="text-blue-400">
            <span className="font-bold">{payload[0].value.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Expected Goals Card */}
      <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Expected Goals (xG)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {alphaAnalysis.expectedGoals.home.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">{teamAName}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">
                {alphaAnalysis.expectedGoals.away.toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">{teamBName}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Prediction Chart */}
      <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Brain className="w-5 h-5 text-blue-400" />
            Alpha Engine: Match Outcome Probability
            <Badge className="bg-blue-900/50 text-blue-300 border-blue-700">
              {alphaAnalysis.matchOutcomeChart.series[0].name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bar" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
              <TabsTrigger value="bar" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Bar Chart
              </TabsTrigger>
              <TabsTrigger value="pie" className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" />
                Pie Chart
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="bar" className="mt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={barChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  barCategoryGap="20%"
                >
                  <XAxis
                    dataKey="fullName"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="pie" className="mt-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend 
                    wrapperStyle={{ color: '#FFF' }}
                    formatter={(value, entry) => `${value}: ${entry.payload?.value.toFixed(1)}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Model Comparison Chart (if data is available) */}
      {modelComparisonData && (
        <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D] border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="w-5 h-5 text-green-400" />
              Model Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={modelComparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis
                  dataKey="model"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111',
                    border: '1px solid #333',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: '#FFF' }}
                />
                <Legend wrapperStyle={{ color: '#FFF' }} />
                <Bar dataKey="home" fill="#3b82f6" name={`${teamAName} Win`} radius={[2, 2, 0, 0]} />
                <Bar dataKey="draw" fill="#64748b" name="Draw" radius={[2, 2, 0, 0]} />
                <Bar dataKey="away" fill="#ef4444" name={`${teamBName} Win`} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 