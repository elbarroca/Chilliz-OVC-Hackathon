// pages/api/leaderboard.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const client = await clientPromise;
        const db = client.db('alphastakes');

        // This is a powerful aggregation pipeline to process data on the database itself.
        const leaderboard = await db.collection('stakes').aggregate([
            // Stage 1: Group by user address
            {
                $group: {
                    _id: "$userAddress",
                    totalStaked: { $sum: "$amountStaked" },
                    totalReturned: { $sum: "$amountReturned" },
                    totalStakes: { $sum: 1 },
                    stakesWon: {
                        $sum: { $cond: [{ $eq: ["$status", "WON"] }, 1, 0] }
                    }
                }
            },
            // Stage 2: Calculate net profit and win rate
            {
                $project: {
                    userAddress: "$_id",
                    netProfit: { $subtract: ["$totalReturned", "$totalStaked"] },
                    winRate: {
                        $multiply: [{ $divide: ["$stakesWon", "$totalStakes"] }, 100]
                    },
                    _id: 0 // Exclude the default _id field
                }
            },
            // Stage 3: Sort by the highest profit
            { $sort: { netProfit: -1 } },
            // Stage 4: Limit to the top 100 players
            { $limit: 100 }
        ]).toArray();

        return res.status(200).json(leaderboard);

    } catch (e) {
        console.error("Aggregation Error:", e);
        return res.status(500).json({ error: 'Failed to generate leaderboard' });
    }
}