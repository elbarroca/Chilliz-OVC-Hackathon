import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongo';
import { type Match, type MatchAnalysisData, type Team } from '@/types';

/**
 * Transforms a match analysis document from MongoDB into the `Match` type
 * used for list views on the frontend.
 * @param doc The document from the `match_analysis` collection.
 * @returns A `Match` object.
 */
function transformAnalysisToMatch(doc: MatchAnalysisData): Match {
  const { fixture_info, match_outcome_probabilities } = doc;

  const teamA: Team = {
    name: fixture_info.home_team,
    slug: fixture_info.home_team.toLowerCase().replace(/\s+/g, '-'),
    logoUrl: fixture_info.home_team_logo || '',
  };

  const teamB: Team = {
    name: fixture_info.away_team,
    slug: fixture_info.away_team.toLowerCase().replace(/\s+/g, '-'),
    logoUrl: fixture_info.away_team_logo || '',
  };
  
  const mainPredictions = match_outcome_probabilities?.monte_carlo || {
    home_win: 0, draw: 0, away_win: 0
  };
  
  const matchDate = new Date(fixture_info.date || Date.now());
  const now = new Date();
  const status = matchDate < now ? 'ENDED' : 'UPCOMING';

  return {
    _id: fixture_info.fixture_id.toString(),
    matchId: parseInt(fixture_info.fixture_id, 10),
    teamA,
    teamB,
    matchTime: matchDate.toISOString(),
    league: {
      name: fixture_info.league_name || 'Special Event',
      logoUrl: '', // League logo not available in analysis data
    },
    status,
    alphaPredictions: {
      winA_prob: mainPredictions.home_win,
      draw_prob: mainPredictions.draw,
      winB_prob: mainPredictions.away_win,
    },
    analysisData: doc, // Pass the full analysis data
  };
}

interface PredictionsDocument {
  date: string;
  total_matches: number;
  matches: MatchAnalysisData[];
  summary_stats: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Match[] | { error: string, details?: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const client = await clientPromise;
    const db = client.db('Alpha');
    const predictionsCollection = db.collection<PredictionsDocument>('predictions');
    const { type, date } = req.query;

    let queryDate: string;

    if (type === 'past') {
      if (typeof date !== 'string') {
        return res.status(400).json({ error: 'Date parameter is required for past matches.' });
      }
      queryDate = date;
    } else { // Default to upcoming matches
      queryDate = new Date().toISOString().split('T')[0];
    }
    
    // Fetch the single document for the given date.
    let predictionsDoc = await predictionsCollection.findOne({ date: queryDate });

    // If no document is found for the given date, try to find the most recent one.
    if (!predictionsDoc) {
      console.log(`No predictions document for date: ${queryDate}. Finding most recent.`);
      const latestDoc = await predictionsCollection.find().sort({ date: -1 }).limit(1).toArray();
      if (latestDoc.length > 0) {
        predictionsDoc = latestDoc[0];
        console.log(`Found most recent predictions from date: ${predictionsDoc.date}`);
      }
    }
    
    if (!predictionsDoc || predictionsDoc.matches.length === 0) {
      console.log(`No predictions documents found at all.`);
      return res.status(200).json([]);
    }

    // The document contains an array of matches; we transform each one.
    const matches: Match[] = predictionsDoc.matches.map(transformAnalysisToMatch);

    // Sort matches by time as an extra step, since they are nested now.
    matches.sort((a, b) => new Date(a.matchTime).getTime() - new Date(b.matchTime).getTime());
    
    return res.status(200).json(matches);

  } catch (e) {
    console.error('Database Error in /api/matches:', e);
    const error = e as Error;
    return res.status(500).json({ 
        error: 'Failed to fetch matches from the database.',
        details: error.message 
    });
  }
}