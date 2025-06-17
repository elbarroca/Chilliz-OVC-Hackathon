import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongo';

function createTeamSlug(teamName: string): string {
  return teamName.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function createMatchSlug(teamA: string, teamB: string): string {
  return `${createTeamSlug(teamA)}-vs-${createTeamSlug(teamB)}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { teams, date } = req.query;

  if (typeof teams !== 'string' || typeof date !== 'string') {
    return res.status(400).json({ error: 'Teams and date parameters are required' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('Alpha');
    
    // Parse the date
    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 1);

    // Search in both collections
    const matchesCollection = db.collection('matches');
    const matchProcessorCollection = db.collection('match_processor');

    // Query for matches on the specified date
    const dateQuery = {
      match_date: {
        $gte: startDate,
        $lt: endDate,
      }
    };

    // Search in upcoming matches first
    const upcomingMatches = await matchesCollection.find(dateQuery).toArray();
    
    // Search in processed matches
    const processedMatches = await matchProcessorCollection.find(dateQuery).toArray();
    
    // Combine all matches
    const allMatches = [...upcomingMatches, ...processedMatches];

    // Find match by team slug comparison
    for (const match of allMatches) {
      const homeTeam = match.home_team_name;
      const awayTeam = match.away_team_name;
      
      if (homeTeam && awayTeam) {
        const matchSlug = createMatchSlug(homeTeam, awayTeam);
        const reverseMatchSlug = createMatchSlug(awayTeam, homeTeam);
        
        if (matchSlug === teams || reverseMatchSlug === teams) {
          return res.status(200).json({
            matchId: match._id.toString(),
            teamA: homeTeam,
            teamB: awayTeam,
            matchDate: match.match_date,
            slug: matchSlug
          });
        }
      }
    }

    // If no exact match found, try partial matching
    for (const match of allMatches) {
      const homeTeam = match.home_team_name;
      const awayTeam = match.away_team_name;
      
      if (homeTeam && awayTeam) {
        const homeSlug = createTeamSlug(homeTeam);
        const awaySlug = createTeamSlug(awayTeam);
        
        // Check if the teams parameter contains both team slugs
        if (teams.includes(homeSlug) && teams.includes(awaySlug)) {
          const matchSlug = createMatchSlug(homeTeam, awayTeam);
          return res.status(200).json({
            matchId: match._id.toString(),
            teamA: homeTeam,
            teamB: awayTeam,
            matchDate: match.match_date,
            slug: matchSlug
          });
        }
      }
    }

    return res.status(404).json({ error: 'Match not found' });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 