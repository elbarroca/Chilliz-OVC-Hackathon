import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type Match } from '@/types';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Activity, 
  Zap, 
  Shield, 
  Clock,
  MapPin,
  Users,
  Trophy,
  User,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

// Mock comprehensive match analysis data
const mockAnalysisData = {
  probabilityAnalysis: {
    homeWin: 45.2,
    draw: 28.1,
    awayWin: 26.7,
    confidence: 87
  },
  formAnalysis: {
    homeTeam: {
      last5Games: ['W', 'W', 'D', 'L', 'W'],
      goalsScored: 8,
      goalsConceded: 4,
      cleanSheets: 2
    },
    awayTeam: {
      last5Games: ['L', 'W', 'W', 'D', 'W'],
      goalsScored: 7,
      goalsConceded: 5,
      cleanSheets: 1
    }
  },
  headToHead: {
    totalMeetings: 12,
    homeWins: 6,
    draws: 3,
    awayWins: 3,
    avgGoalsHome: 1.8,
    avgGoalsAway: 1.2
  },
  keyStats: {
    possession: { home: 58, away: 42 },
    shotsPerGame: { home: 14.2, away: 11.8 },
    passAccuracy: { home: 84, away: 79 },
    cornersPerGame: { home: 6.1, away: 4.8 },
    foulsPerGame: { home: 12.3, away: 15.7 }
  },
  injuries: {
    home: ['Midfielder J. Smith (hamstring)', 'Defender K. Wilson (ankle)'],
    away: ['Forward M. Johnson (knee)', 'Goalkeeper R. Davis (shoulder)']
  },
  weather: {
    condition: 'Clear',
    temperature: '18°C',
    humidity: '65%',
    windSpeed: '12 km/h'
  },
  venue: {
    name: 'Emirates Stadium',
    capacity: 60704,
    homeAdvantage: '+12%'
  },
  playerSpotlight: {
    home: [
      { name: 'A. Striker', position: 'Forward', stat: '5 Goals', statLabel: 'Last 5 Games' },
      { name: 'B. Playmaker', position: 'Midfielder', stat: '4 Assists', statLabel: 'Last 5 Games' },
    ],
    away: [
      { name: 'X. Finisher', position: 'Forward', stat: '4 Goals', statLabel: 'Last 5 Games' },
      { name: 'Y. Defender', position: 'Defender', stat: '12 Tackles', statLabel: 'Last Game' },
    ]
  },
  disciplinary: {
    home: { yellowCards: 21, redCards: 1 },
    away: { yellowCards: 28, redCards: 3 }
  },
  scoringTrends: {
    homeScored: [10, 20, 40, 60, 80, 50], // % of goals scored in 15-min intervals
    awayScored: [15, 30, 25, 50, 60, 70],
  }
};

function StatBar({ label, homeValue, awayValue, homeTeam, awayTeam }: {
  label: string;
  homeValue: number;
  awayValue: number;
  homeTeam: string;
  awayTeam: string;
}) {
  const total = homeValue + awayValue;
  const homePercentage = total > 0 ? (homeValue / total) * 100 : 50;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="font-semibold text-gray-300">{homeValue}</span>
        <span className="text-xs text-gray-400">{label}</span>
        <span className="font-semibold text-gray-300">{awayValue}</span>
      </div>
      <div className="flex-1 flex h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="bg-blue-500 transition-all duration-500" 
          style={{ width: `${homePercentage}%` }}
        ></div>
        <div 
          className="bg-purple-500 transition-all duration-500" 
          style={{ width: `${100 - homePercentage}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{homeTeam}</span>
        <span>{awayTeam}</span>
      </div>
    </div>
  );
}

function FormIndicator({ results }: { results: string[] }) {
  return (
    <div className="flex gap-1.5">
      {results.map((result, index) => {
        let icon;
        let colorClass;
        if (result === 'W') {
          icon = <ArrowUp size={14} />;
          colorClass = 'bg-green-800/30 text-green-300 border-green-700/50';
        } else if (result === 'D') {
          icon = <Minus size={14} />;
          colorClass = 'bg-yellow-800/30 text-yellow-300 border-yellow-700/50';
        } else {
          icon = <ArrowDown size={14} />;
          colorClass = 'bg-red-800/30 text-red-300 border-red-700/50';
        }
        return (
          <div
            key={index}
            className={`w-7 h-7 rounded-md flex items-center justify-center font-bold border ${colorClass}`}
          >
            {icon}
          </div>
        );
      })}
    </div>
  );
}

function PlayerStatCard({ player }: { player: any }) {
  return (
    <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 flex items-center gap-3">
      <User size={24} className="text-gray-400" />
      <div className="flex-1">
        <p className="font-bold text-white">{player.name}</p>
        <p className="text-xs text-gray-400">{player.position}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-green-400">{player.stat}</p>
        <p className="text-xs text-gray-500">{player.statLabel}</p>
      </div>
    </div>
  );
}

function GoalTimingChart({ timings, teamColor }: { timings: number[], teamColor: string }) {
  return (
    <div className="flex items-end h-24 gap-1 p-2 bg-gray-900/50 rounded-lg border border-gray-700/50">
      {timings.map((value, index) => (
        <div key={index} className="flex-1 flex flex-col justify-end items-center">
          <div 
            className={`w-full rounded-t-sm transition-all duration-500 ${teamColor}`}
            style={{ height: `${value}%` }}
          ></div>
          <span className="text-[10px] text-gray-500 pt-1">
            {index * 15 + 15}&apos;
          </span>
        </div>
      ))}
    </div>
  );
}

export function GameAnalysis({ match }: { match: Match }) {
  const { probabilityAnalysis, formAnalysis, headToHead, keyStats, injuries, weather, venue, playerSpotlight, disciplinary, scoringTrends } = mockAnalysisData;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#161616] to-[#101010] border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
              <BarChart3 className="text-white" size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">In-Depth Match Analysis</div>
              <div className="text-sm text-gray-400">AI-powered comprehensive breakdown</div>
            </div>
            <Badge className="ml-auto bg-blue-600/50 text-blue-300 border border-blue-500/50">
              Live Analysis
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Probability Analysis */}
      <Card className="bg-gradient-to-br from-[#161616] to-[#101010] border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-300">
            <Target className="text-gray-400" size={18} />
            Win Probability Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-4 bg-[#1C2541]/50 rounded-lg border border-blue-800/50">
              <div className="text-4xl font-bold text-blue-300">{probabilityAnalysis.homeWin}%</div>
              <div className="text-sm text-gray-400 mt-1">{match.teamA.name} Win</div>
            </div>
            <div className="text-center p-4 bg-gray-800/40 rounded-lg border border-gray-700/80">
              <div className="text-4xl font-bold text-gray-300">{probabilityAnalysis.draw}%</div>
              <div className="text-sm text-gray-400 mt-1">Draw</div>
            </div>
            <div className="text-center p-4 bg-[#2A1B3D]/50 rounded-lg border border-purple-800/50">
              <div className="text-4xl font-bold text-purple-300">{probabilityAnalysis.awayWin}%</div>
              <div className="text-sm text-gray-400 mt-1">{match.teamB.name} Win</div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 p-2 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <Zap className="text-yellow-400/80" size={16} />
            <span className="text-gray-300 text-sm font-medium">Model Confidence: {probabilityAnalysis.confidence}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Team Form Analysis */}
      <Card className="bg-gradient-to-br from-[#161616] to-[#101010] border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-300">
            <TrendingUp className="text-gray-400" size={18} />
            Recent Form Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Home Team Form */}
            <div className="space-y-4 p-4 rounded-lg border border-gray-800 bg-gray-900/30">
              <div className="flex items-center gap-3">
                <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={32} height={32} className="w-8 h-8" />
                <h4 className="font-semibold text-white text-lg">{match.teamA.name}</h4>
              </div>
              
              <div className="space-y-4">
                <FormIndicator results={formAnalysis.homeTeam.last5Games} />
                
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-gray-800/50 rounded-lg">
                    <div className="text-xl font-bold text-green-400">{formAnalysis.homeTeam.goalsScored}</div>
                    <div className="text-xs text-gray-400">Goals</div>
                  </div>
                  <div className="p-2 bg-gray-800/50 rounded-lg">
                    <div className="text-xl font-bold text-red-400">{formAnalysis.homeTeam.goalsConceded}</div>
                    <div className="text-xs text-gray-400">Conceded</div>
                  </div>
                  <div className="p-2 bg-gray-800/50 rounded-lg">
                    <div className="text-xl font-bold text-blue-400">{formAnalysis.homeTeam.cleanSheets}</div>
                    <div className="text-xs text-gray-400">Clean Sheets</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Away Team Form */}
            <div className="space-y-4 p-4 rounded-lg border border-gray-800 bg-gray-900/30">
              <div className="flex items-center gap-3">
                <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={32} height={32} className="w-8 h-8" />
                <h4 className="font-semibold text-white text-lg">{match.teamB.name}</h4>
              </div>
              
              <div className="space-y-4">
                <FormIndicator results={formAnalysis.awayTeam.last5Games} />
                
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-gray-800/50 rounded-lg">
                    <div className="text-xl font-bold text-green-400">{formAnalysis.awayTeam.goalsScored}</div>
                    <div className="text-xs text-gray-400">Goals</div>
                  </div>
                  <div className="p-2 bg-gray-800/50 rounded-lg">
                    <div className="text-xl font-bold text-red-400">{formAnalysis.awayTeam.goalsConceded}</div>
                    <div className="text-xs text-gray-400">Conceded</div>
                  </div>
                  <div className="p-2 bg-gray-800/50 rounded-lg">
                    <div className="text-xl font-bold text-blue-400">{formAnalysis.awayTeam.cleanSheets}</div>
                    <div className="text-xs text-gray-400">Clean Sheets</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Head to Head */}
      <Card className="bg-gradient-to-br from-[#161616] to-[#101010] border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-300">
            <Trophy className="text-gray-400" size={18} />
            Head-to-Head Record
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center p-3 bg-gray-800/40 rounded-lg border border-gray-700/80">
            <div className="text-2xl font-bold text-white">{headToHead.totalMeetings}</div>
            <div className="text-sm text-gray-400">Total Meetings</div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-[#1C2541]/50 rounded-lg border border-blue-800/50">
              <div className="text-xl font-bold text-blue-300">{headToHead.homeWins}</div>
              <div className="text-xs text-gray-400">{match.teamA.name} Wins</div>
            </div>
            <div className="p-3 bg-gray-800/40 rounded-lg border border-gray-700/80">
              <div className="text-xl font-bold text-gray-300">{headToHead.draws}</div>
              <div className="text-xs text-gray-400">Draws</div>
            </div>
            <div className="p-3 bg-[#2A1B3D]/50 rounded-lg border border-purple-800/50">
              <div className="text-xl font-bold text-purple-300">{headToHead.awayWins}</div>
              <div className="text-xs text-gray-400">{match.teamB.name} Wins</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-gray-800/30 rounded-lg">
              <div className="text-lg font-bold text-gray-300">{headToHead.avgGoalsHome}</div>
              <div className="text-xs text-gray-400">Avg Goals ({match.teamA.name})</div>
            </div>
            <div className="p-3 bg-gray-800/30 rounded-lg">
              <div className="text-lg font-bold text-gray-300">{headToHead.avgGoalsAway}</div>
              <div className="text-xs text-gray-400">Avg Goals ({match.teamB.name})</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Statistics Comparison */}
      <Card className="bg-gradient-to-br from-[#161616] to-[#101010] border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-300">
            <Activity className="text-gray-400" size={18} />
            Key Statistics Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <StatBar 
            label="Possession %" 
            homeValue={keyStats.possession.home} 
            awayValue={keyStats.possession.away}
            homeTeam={match.teamA.name}
            awayTeam={match.teamB.name}
          />
          <StatBar 
            label="Shots per Game" 
            homeValue={keyStats.shotsPerGame.home} 
            awayValue={keyStats.shotsPerGame.away}
            homeTeam={match.teamA.name}
            awayTeam={match.teamB.name}
          />
          <StatBar 
            label="Pass Accuracy %" 
            homeValue={keyStats.passAccuracy.home} 
            awayValue={keyStats.passAccuracy.away}
            homeTeam={match.teamA.name}
            awayTeam={match.teamB.name}
          />
          <StatBar 
            label="Corners per Game" 
            homeValue={keyStats.cornersPerGame.home} 
            awayValue={keyStats.cornersPerGame.away}
            homeTeam={match.teamA.name}
            awayTeam={match.teamB.name}
          />
        </CardContent>
      </Card>

      {/* Player Spotlight Section */}
      <Card className="bg-gradient-to-br from-[#161616] to-[#101010] border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-300">
            <User className="text-gray-400" size={18} />
            Player Spotlight
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={24} height={24} className="w-6 h-6" />
              {match.teamA.name}
            </h4>
            {playerSpotlight.home.map((p: any) => <PlayerStatCard key={p.name} player={p} />)}
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={24} height={24} className="w-6 h-6" />
              {match.teamB.name}
            </h4>
            {playerSpotlight.away.map((p: any) => <PlayerStatCard key={p.name} player={p} />)}
          </div>
        </CardContent>
      </Card>
      
      {/* Scoring Trends & Disciplinary Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-[#161616] to-[#101010] border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-300">
              <Clock className="text-gray-400" size={18} />
              Scoring Timings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-blue-300 mb-2">{match.teamA.name} - Goals Scored</h4>
              <GoalTimingChart timings={scoringTrends.homeScored} teamColor="bg-blue-500" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-purple-300 mb-2">{match.teamB.name} - Goals Scored</h4>
              <GoalTimingChart timings={scoringTrends.awayScored} teamColor="bg-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#161616] to-[#101010] border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-300">
              <ShieldAlert className="text-gray-400" size={18} />
              Disciplinary Record
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-900/50 rounded-lg text-center border border-gray-700/80">
              <p className="text-2xl font-bold text-yellow-400">{disciplinary.home.yellowCards}</p>
              <p className="text-xs text-gray-400">Yellow Cards ({match.teamA.name})</p>
            </div>
            <div className="p-3 bg-gray-900/50 rounded-lg text-center border border-gray-700/80">
              <p className="text-2xl font-bold text-yellow-400">{disciplinary.away.yellowCards}</p>
              <p className="text-xs text-gray-400">Yellow Cards ({match.teamB.name})</p>
            </div>
            <div className="p-3 bg-gray-900/50 rounded-lg text-center border border-gray-700/80">
              <p className="text-2xl font-bold text-red-500">{disciplinary.home.redCards}</p>
              <p className="text-xs text-gray-400">Red Cards ({match.teamA.name})</p>
            </div>
             <div className="p-3 bg-gray-900/50 rounded-lg text-center border border-gray-700/80">
              <p className="text-2xl font-bold text-red-500">{disciplinary.away.redCards}</p>
              <p className="text-xs text-gray-400">Red Cards ({match.teamB.name})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Conditions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Venue & Conditions */}
        <Card className="bg-gradient-to-br from-[#161616] to-[#101010] border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-300">
              <MapPin className="text-gray-400" size={18} />
              Venue & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Venue:</span>
                <span className="text-white font-medium">{venue.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Capacity:</span>
                <span className="text-white font-medium">{venue.capacity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Home Advantage:</span>
                <span className="text-green-400 font-medium">{venue.homeAdvantage}</span>
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Weather:</span>
                <span className="text-white font-medium">{weather.condition}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Temperature:</span>
                <span className="text-white font-medium">{weather.temperature}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Wind Speed:</span>
                <span className="text-white font-medium">{weather.windSpeed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Injuries & Suspensions */}
        <Card className="bg-gradient-to-br from-[#161616] to-[#101010] border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-300">
              <Shield className="text-gray-400" size={18} />
              Team News
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Image src={match.teamA.logoUrl} alt={match.teamA.name} width={20} height={20} className="w-5 h-5" />
                {match.teamA.name}
              </h4>
              {injuries.home.length > 0 ? (
                <div className="space-y-1">
                  {injuries.home.map((injury, index) => (
                    <div key={index} className="text-sm text-red-400 bg-red-900/20 p-2 rounded border border-red-700/30 flex items-center gap-2">
                      <Minus size={14} /> {injury}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 bg-gray-800/50 p-2 rounded">No reported injuries.</div>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2 mt-4">
                <Image src={match.teamB.logoUrl} alt={match.teamB.name} width={20} height={20} className="w-5 h-5" />
                {match.teamB.name}
              </h4>
              {injuries.away.length > 0 ? (
                <div className="space-y-1">
                  {injuries.away.map((injury, index) => (
                    <div key={index} className="text-sm text-red-400 bg-red-900/20 p-2 rounded border border-red-700/30 flex items-center gap-2">
                      <Minus size={14} /> {injury}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 bg-gray-800/50 p-2 rounded">No reported injuries.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 