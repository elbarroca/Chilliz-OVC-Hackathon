import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongo';

/**
 * API endpoint to trigger daily data collection and prediction analysis.
 * This should be called by a cron job once a day.
 *
 * In a production environment, this endpoint should be secured with a secret key
 * to prevent unauthorized access.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // For Vercel Cron, check the authorization header
    if (process.env.CRON_SECRET && req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

        console.log(`[CRON] Starting daily update for ${today}...`);

        // Step 1: Trigger data collection in the Python API for today's matches.
        console.log(`[CRON] Triggering data collection at ${pythonApiUrl}/data/${today}`);
        const collectResponse = await fetch(`${pythonApiUrl}/data/${today}`, { method: 'POST' });
        if (!collectResponse.ok) {
            const errorText = await collectResponse.text();
            console.error(`[CRON] Failed to trigger data collection: ${collectResponse.status}`, errorText);
            throw new Error(`Failed to trigger data collection: ${collectResponse.status} - ${errorText}`);
        }
        const collectData = await collectResponse.json();
        console.log('[CRON] Data collection API response:', collectData);

        // Step 2: Fetch the generated predictions and analysis.
        console.log(`[CRON] Fetching predictions from ${pythonApiUrl}/predictions/${today}`);
        const predictionsResponse = await fetch(`${pythonApiUrl}/predictions/${today}`);
        if (!predictionsResponse.ok) {
            const errorText = await predictionsResponse.text();
            console.error(`[CRON] Failed to fetch predictions: ${predictionsResponse.status}`, errorText);
            throw new Error(`Failed to fetch predictions: ${predictionsResponse.status} - ${errorText}`);
        }
        const predictionsData = await predictionsResponse.json();

        if (!predictionsData.matches || predictionsData.matches.length === 0) {
            console.log('[CRON] No matches found in predictions response. Nothing to update.');
            return res.status(200).json({ message: 'No matches found to update.' });
        }
        console.log(`[CRON] Received ${predictionsData.matches.length} matches to process.`);

        // Step 3: Save the analysis data to our MongoDB `match_analysis` collection.
        const client = await clientPromise;
        const db = client.db('Alpha');
        const collection = db.collection('match_analysis');

        // We use bulkWrite with upsert to efficiently insert new matches or update existing ones.
        const operations = predictionsData.matches.map((match: any) => ({
            updateOne: {
                filter: { 'fixture_info.fixture_id': match.fixture_info.fixture_id },
                update: { $set: match },
                upsert: true,
            },
        }));
        
        console.log(`[CRON] Performing ${operations.length} bulk write operations...`);
        const result = await collection.bulkWrite(operations);
        console.log('[CRON] Bulk write operation successful.', result);

        res.status(200).json({
            message: 'Successfully updated match analysis data.',
            date: today,
            ...result,
        });

    } catch (error) {
        console.error('[CRON] Daily update job failed:', error);
        const err = error as Error;
        res.status(500).json({ 
            message: 'Cron job failed', 
            error: err.message,
            stack: err.stack 
        });
    }
} 