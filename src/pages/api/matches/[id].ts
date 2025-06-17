// pages/api/matches/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongo';
import { ObjectId } from 'mongodb';
import { type MatchWithAnalysis, type AlphaAnalysis, type Team } from '@/types';

// Helper function to fetch prediction data from Python API
async function fetchPredictionData(matchDate: string): Promise<any> {
  try {
    const response = await fetch(`http://127.0.0.1:8000/predictions/${matchDate}`);
    if (!response.ok) {
      console.warn(`Prediction API returned ${response.status} for date ${matchDate}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch prediction data:', error);
    return null;
  }
}

// This function now specifically transforms the nested prediction data from the DB
function transformPredictionData(doc: any): AlphaAnalysis | null {
  const prediction = doc.predictions?.[0]?.predictions;
  if (!prediction) return null;

  try {
    // These paths are based on the user-provided JSON structure
    const home_prob = parseFloat(prediction.percent?.home?.replace('%', '')) / 100 || 0;
    const draw_prob = parseFloat(prediction.percent?.draw?.replace('%', '')) / 100 || 0;
    const away_prob = parseFloat(prediction.percent?.away?.replace('%', '')) / 100 || 0;

    return {
      expectedGoals: {
        home: prediction.goals?.home || 0,
        away: prediction.goals?.away || 0,
      },
      matchOutcomeChart: {
        categories: ["Home Win", "Draw", "Away Win"],
        series: [{
          name: "Primary Model", // You can enhance this if model names are available in DB
          data: [home_prob, draw_prob, away_prob]
        }]
      }
      // modelComparison can be added here if the data exists in the document
    };
  } catch (error) {
    console.error('Error transforming prediction data from DB document:', error);
    return null;
  }
}

// New transformer for match_processor documents
function transformMatchProcessorDoc(doc: any): MatchWithAnalysis {
    const home_prob = parseFloat(doc.predictions?.[0]?.predictions?.percent?.home?.replace('%', '')) / 100 || 0;
    const draw_prob = parseFloat(doc.predictions?.[0]?.predictions?.percent?.draw?.replace('%', '')) / 100 || 0;
    const away_prob = parseFloat(doc.predictions?.[0]?.predictions?.percent?.away?.replace('%', '')) / 100 || 0;

    const teamA: Team = {
      name: doc.home_team_name,
      slug: doc.home_team_name.toLowerCase().replace(/\s+/g, '-'),
      logoUrl: doc.home_stats?.team?.logo || '',
    };
    
    const teamB: Team = {
      name: doc.away_team_name,
      slug: doc.away_team_name.toLowerCase().replace(/\s+/g, '-'),
      logoUrl: doc.away_stats?.team?.logo || '',
    };

    return {
        _id: doc._id.toString(),
        matchId: parseInt(doc.fixture_id || doc._id, 10),
        teamA: teamA,
        teamB: teamB,
        matchTime: doc.match_date.toISOString(),
        league: doc.home_stats?.league?.name || doc.away_stats?.league?.name,
        status: 'ENDED', // Assuming all matches from match_processor are finished
        alphaPredictions: {
            winA_prob: home_prob,
            draw_prob: draw_prob,
            winB_prob: away_prob,
        },
        alphaAnalysis: transformPredictionData(doc) ?? undefined,
    };
}

interface MatchProcessorDocument {
  _id: string;
  [key: string]: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid Match ID' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('alphastakes');
    const matchesCollection = db.collection('matches');
    const matchProcessorCollection = db.collection<MatchProcessorDocument>('match_processor');
    let matchDoc: any = null;

    if (req.method === 'GET') {
        // Try to find in 'matches' collection first, assuming it uses ObjectId for upcoming
        if (ObjectId.isValid(id)) {
          const objectId = new ObjectId(id);
          matchDoc = await matchesCollection.findOne({ _id: objectId });
        }

        // If not found in 'matches', try 'match_processor' with the string id (for past matches)
        if (!matchDoc) {
          const processorDoc = await matchProcessorCollection.findOne({ _id: id });
          if (processorDoc) {
            const transformedMatch = transformMatchProcessorDoc(processorDoc);
            return res.status(200).json(transformedMatch);
          }
        }
        
        if (matchDoc) {
            const matchWithAnalysis: MatchWithAnalysis = {
              _id: matchDoc._id.toString(),
              matchId: matchDoc.fixture_id,
              teamA: {
                name: matchDoc.home_team_name,
                slug: matchDoc.home_team_name.toLowerCase().replace(/\s+/g, '-'),
                logoUrl: matchDoc.teams?.home?.logo || '',
              },
              teamB: {
                name: matchDoc.away_team_name,
                slug: matchDoc.away_team_name.toLowerCase().replace(/\s+/g, '-'),
                logoUrl: matchDoc.teams?.away?.logo || '',
              },
              matchTime: matchDoc.match_date,
              league: matchDoc.league?.name,
              status: matchDoc.fixture_status === 'NS' ? 'UPCOMING' : 'ENDED',
              alphaPredictions: {
                winA_prob: parseFloat(matchDoc.predictions?.[0]?.predictions?.percent?.home?.replace('%','')) / 100 || 0,
                draw_prob: parseFloat(matchDoc.predictions?.[0]?.predictions?.percent?.draw?.replace('%','')) / 100 || 0,
                winB_prob: parseFloat(matchDoc.predictions?.[0]?.predictions?.percent?.away?.replace('%','')) / 100 || 0,
              },
              alphaAnalysis: transformPredictionData(matchDoc) ?? undefined,
            };
      
            return res.status(200).json(matchWithAnalysis);
        }
      
        return res.status(404).json({ error: 'Match not found in any collection' });
    }

    // --- Handle PUT Request (for updating results, operates on 'matches' collection) ---
    if (req.method === 'PUT') {
      if (typeof id !== 'string' || !ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid Match ID format for update operation' });
      }
      const objectId = new ObjectId(id);
      
      // **SECURITY:** Protect this endpoint so only an admin can update results.
      if (req.headers.authorization !== `Bearer ${process.env.ADMIN_API_KEY}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { status, result } = req.body;

      // **VALIDATION:** Ensure the required fields are present for an update.
      if (status !== 'ENDED' || !result || !result.winner) {
          return res.status(400).json({ 
              error: 'Invalid payload. Update requires status: "ENDED" and a result object with a winner.' 
          });
      }

      const updateResult = await matchesCollection.updateOne(
        { _id: objectId },
        { 
          $set: { 
            status: 'ENDED',
            result: {
              winner: result.winner, // 'teamA', 'teamB', or 'draw'
            }
          } 
        }
      );

      if (updateResult.matchedCount === 0) {
        return res.status(404).json({ error: 'Match not found for update.' });
      }

      return res.status(200).json({ success: true, modifiedCount: updateResult.modifiedCount });
    }

    // --- If method is not GET or PUT ---
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}