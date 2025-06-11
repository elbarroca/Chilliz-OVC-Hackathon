// pages/api/matches/[id].ts

import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongo';
import { ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  // --- Validate the ID first, as it's used by all methods ---
  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid Match ID format' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('alphastakes');
    const matchesCollection = db.collection('matches');
    const objectId = new ObjectId(id);

    // --- Handle GET Request ---
    if (req.method === 'GET') {
      const match = await matchesCollection.findOne({ _id: objectId });

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      return res.status(200).json(match);
    }

    // --- Handle PUT Request (for updating results) ---
    if (req.method === 'PUT') {
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