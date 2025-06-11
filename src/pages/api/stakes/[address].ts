import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongo';
import { type UserStake } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { address } = req.query;

        // Basic validation for the address
        if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        const client = await clientPromise;
        const db = client.db('alphastakes');

        // This assumes you have a 'stakes' collection where you log each user's stake
        const userStakes = await db.collection<UserStake>('stakes')
            .find({ userAddress: address })
            .sort({ stakeTime: -1 }) // Show most recent first
            .toArray();
            
        return res.status(200).json(userStakes);

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
} 