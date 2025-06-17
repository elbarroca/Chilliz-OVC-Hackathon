import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongo';
import { type Match, type Team } from '@/types';

// Helper to transform the raw MongoDB document into our frontend Match type
function transformMatch(doc: any): Match {
  return {
    _id: doc._id.toString(),
    matchId: doc.fixture_id,
    teamA: {
      name: doc.home_team_name,
      slug: doc.home_team_name.toLowerCase().replace(/\s+/g, '-'),
      logoUrl: doc.teams?.home?.logo || 'default_logo_url.png', // Fallback logo
    },
    teamB: {
      name: doc.away_team_name,
      slug: doc.away_team_name.toLowerCase().replace(/\s+/g, '-'),
      logoUrl: doc.teams?.away?.logo || 'default_logo_url.png', // Fallback logo
    },
    matchTime: doc.match_date,
    league: doc.league?.name,
    status: doc.fixture_status === 'NS' ? 'UPCOMING' : 'ENDED', // Map status
    alphaPredictions: {
      winA_prob: parseFloat(doc.predictions?.[0]?.predictions?.percent?.home?.replace('%','')) / 100 || 0,
      draw_prob: parseFloat(doc.predictions?.[0]?.predictions?.percent?.draw?.replace('%','')) / 100 || 0,
      winB_prob: parseFloat(doc.predictions?.[0]?.predictions?.percent?.away?.replace('%','')) / 100 || 0,
    },
  };
}

// New transformer for 'match_processor' documents for the list view
function transformProcessorMatch(doc: any): Match {
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
    _id: doc._id.toString(), // The string fixture_id
    matchId: parseInt(doc.fixture_id || doc._id, 10),
    teamA,
    teamB,
    matchTime: doc.match_date.toISOString(),
    league: doc.home_stats?.league?.name || doc.away_stats?.league?.name,
    status: 'ENDED',
    alphaPredictions: {
      winA_prob: home_prob,
      draw_prob: draw_prob,
      winB_prob: away_prob,
    },
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
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const client = await clientPromise;
    const db = client.db('alphastakes'); 
    const { type, date } = req.query;

    if (type === 'past') {
      const matchProcessorCollection = db.collection<MatchProcessorDocument>('match_processor');
      if (typeof date !== 'string') {
        return res.status(400).json({ error: 'Date parameter is required for past matches.' });
      }

      // Querying with strings to handle potential data type mismatch in DB
      const startDateStr = `${date}T00:00:00.000+00:00`;
      
      const tempDate = new Date(date);
      tempDate.setUTCDate(tempDate.getUTCDate() + 1);
      const endDateStr = tempDate.toISOString().split('T')[0] + 'T00:00:00.000+00:00';

      const query = {
        match_date: {
          $gte: startDateStr,
          $lt: endDateStr,
        }
      };

      // --- Start Debug Logging ---
      console.log(`[PAST_MATCHES] Querying 'match_processor' for date: ${date}`);
      console.log('[PAST_MATCHES] MongoDB Query (string-based):', JSON.stringify(query, null, 2));
      // --- End Debug Logging ---

      const processorDocs = await matchProcessorCollection.find(query).sort({ match_date: 1 }).toArray();

      // --- Start Debug Logging ---
      console.log(`[PAST_MATCHES] Found ${processorDocs.length} documents.`);
      // --- End Debug Logging ---

      const matches: Match[] = processorDocs.map(transformProcessorMatch);
      return res.status(200).json(matches);
    }

    // --- Default to upcoming matches ---
    const matchesCollection = db.collection('matches');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    const matchesCursor = matchesCollection.find({
      match_date: {
        $gte: today.toISOString(),
        $lt: tomorrow.toISOString(),
      },
      home_team_name: { $exists: true },
      away_team_name: { $exists: true },
    }).sort({ match_date: 1 });

    const rawMatches = await matchesCursor.toArray();

    if (rawMatches.length === 0) {
      return res.status(200).json([]);
    }

    const matches: Match[] = rawMatches.map(transformMatch);
    return res.status(200).json(matches);

  } catch (e) {
    console.error('Database Error:', e);
    const error = e as Error;
    return res.status(500).json({ 
        error: 'Failed to fetch matches from the database.',
        details: error.message 
    });
  }
}