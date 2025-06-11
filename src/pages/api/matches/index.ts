import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongo';
import { type Match } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const client = await clientPromise;
    const db = client.db('alphastakes'); // Your DB name
    const matchesCollection = db.collection<Match>('matches'); // Your collection name

    switch (req.method) {
      case 'GET':
        const matches = await matchesCollection
          .find({ status: 'UPCOMING' })
          .sort({ matchTime: 1 })
          .toArray();
        return res.status(200).json(matches);

      // This is a protected endpoint for you to add matches.
      case 'POST':
        // Basic security: Check for a secret key in the headers.
        if (req.headers.authorization !== `Bearer ${process.env.ADMIN_API_KEY}`) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const newMatchData = req.body;
        
        // Basic validation (in a real app, use Zod for this)
        if (!newMatchData.teamA || !newMatchData.teamB || !newMatchData.matchTime) {
          return res.status(400).json({ error: 'Missing required match fields' });
        }

        const result = await matchesCollection.insertOne(newMatchData as Match);
        return res.status(201).json({ success: true, insertedId: result.insertedId });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}