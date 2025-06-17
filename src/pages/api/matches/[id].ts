// pages/api/matches/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongo';
import { type MatchWithAnalysis, type MatchAnalysisData, type Team } from '@/types';

/**
 * Transforms a complete match analysis document from MongoDB into the format
 * expected by the frontend (`MatchWithAnalysis`).
 * @param analysisDoc The document from the `match_analysis` collection.
 * @returns A `MatchWithAnalysis` object.
 */
function transformAnalysisToMatch(analysisDoc: MatchAnalysisData): MatchWithAnalysis {
  const { fixture_info, match_outcome_probabilities } = analysisDoc;

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

  // Use 'monte_carlo' as the primary source for top-level predictions.
  const mainPredictions = match_outcome_probabilities?.monte_carlo || {
    home_win: 0, draw: 0, away_win: 0
  };

  // Determine match status based on date.
  const matchDate = new Date(fixture_info.date || Date.now());
  const now = new Date();
  // A simple check: if match time is in the past, it's ENDED.
  // This could be enhanced if the raw data includes a more specific status.
  const status = matchDate < now ? 'ENDED' : 'UPCOMING';

  return {
    _id: fixture_info.fixture_id,
    matchId: parseInt(fixture_info.fixture_id, 10),
    teamA,
    teamB,
    matchTime: matchDate.toISOString(),
    league: {
      name: fixture_info.league_name || 'Special Event',
      logoUrl: '', // Note: League logo is not in the current analysis data.
    },
    status,
    alphaPredictions: {
      winA_prob: mainPredictions.home_win,
      draw_prob: mainPredictions.draw,
      winB_prob: mainPredictions.away_win,
    },
    // The entire analysis document is passed down for detailed components like charts.
    analysisData: analysisDoc,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MatchWithAnalysis | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid Match ID' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('Alpha');
    const analysisCollection = db.collection<MatchAnalysisData>('match_analysis');

    // Query using the fixture_id which is a string in our new collection.
    const analysisDoc = await analysisCollection.findOne({ 'fixture_info.fixture_id': id });

    if (!analysisDoc) {
      return res.status(404).json({ error: 'Match analysis not found.' });
    }

    const match = transformAnalysisToMatch(analysisDoc);
    
    return res.status(200).json(match);

  } catch (e) {
    const error = e as Error;
    console.error('API Error fetching match analysis:', error);
    return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
}