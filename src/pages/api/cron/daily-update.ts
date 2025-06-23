import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint to trigger daily data collection and prediction analysis.
 * This should be called by a cron job once a day.
 *
 * In a production environment, this endpoint should be secured with a secret key
 * to prevent unauthorized access.
 */
export const config = {
  maxDuration: 55, // 55 seconds, to stay within hobby plan limits (60s)
};

// Helper function to make API calls and handle errors
async function triggerPipelineStep(step: 'data' | 'predictions' | 'update', date: string, pythonApiUrl: string) {
  const url = step === 'update' ? `${pythonApiUrl}/results/update` : `${pythonApiUrl}/${step}/${date}`;
  const method = (step === 'data' || step === 'update') ? 'POST' : 'GET';
  
  console.log(`[CRON] Triggering ${step} for ${date} at: ${url}`);
  
  const response = await fetch(url, { method });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[CRON] Step '${step}' for ${date} failed: ${response.status}`, errorText);
    // For 404 on prediction, it's not a critical failure, just means no data.
    if (step === 'predictions' && response.status === 404) {
      console.warn(`[CRON] No data found to run predictions for ${date}. Continuing...`);
      return { status: 'skipped', reason: 'No data found' };
    }
    throw new Error(`${step} API for ${date} returned an error: ${errorText}`);
  }

  const responseData = await response.json();
  console.log(`[CRON] Step '${step}' for ${date} successful.`);
  return responseData;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Vercel Cron jobs send GET requests, which we use as the trigger.
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // It's a good practice to protect your cron jobs.
  const { authorization } = req.headers;
  if (process.env.CRON_SECRET && authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayStr = today.toISOString().split('T')[0];
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  try {
    const results: {
      today: { [key: string]: any };
      tomorrow: { [key: string]: any };
    } = {
      today: {},
      tomorrow: {}
    };

    // --- Execute Pipeline Sequentially ---
    // We run data collection in parallel to speed things up
    const dataPromises = [
      triggerPipelineStep('data', todayStr, pythonApiUrl),
      triggerPipelineStep('data', tomorrowStr, pythonApiUrl)
    ];
    const dataPromiseResults = await Promise.allSettled(dataPromises);

    if (dataPromiseResults[0].status === 'fulfilled') {
      results.today.data = dataPromiseResults[0].value;
    } else {
      results.today.data = { error: dataPromiseResults[0].reason?.message ?? 'Unknown error' };
      console.error(`[CRON] Data collection for ${todayStr} failed:`, dataPromiseResults[0].reason);
    }
    
    if (dataPromiseResults[1].status === 'fulfilled') {
      results.tomorrow.data = dataPromiseResults[1].value;
    } else {
      results.tomorrow.data = { error: dataPromiseResults[1].reason?.message ?? 'Unknown error' };
      console.error(`[CRON] Data collection for ${tomorrowStr} failed:`, dataPromiseResults[1].reason);
    }
    
    // Then run predictions in parallel
    const predictionPromises = [
      triggerPipelineStep('predictions', todayStr, pythonApiUrl),
      triggerPipelineStep('predictions', tomorrowStr, pythonApiUrl)
    ];
    const predictionPromiseResults = await Promise.allSettled(predictionPromises);

    if (predictionPromiseResults[0].status === 'fulfilled') {
        results.today.predictions = predictionPromiseResults[0].value;
    } else {
        results.today.predictions = { error: predictionPromiseResults[0].reason?.message ?? 'Unknown error' };
        console.error(`[CRON] Predictions for ${todayStr} failed:`, predictionPromiseResults[0].reason);
    }

    if (predictionPromiseResults[1].status === 'fulfilled') {
        results.tomorrow.predictions = predictionPromiseResults[1].value;
    } else {
        results.tomorrow.predictions = { error: predictionPromiseResults[1].reason?.message ?? 'Unknown error' };
        console.error(`[CRON] Predictions for ${tomorrowStr} failed:`, predictionPromiseResults[1].reason);
    }

    // Finally, trigger the results update check - this will be moved to its own cron job
    // await triggerPipelineStep('update', 'N/A', pythonApiUrl);

    res.status(200).json({
      message: 'Full data and prediction pipeline for today and tomorrow triggered successfully.',
      results
    });

  } catch (error: any) {
    console.error('[CRON] The daily update job failed during its execution.', error);
    res.status(500).json({
      message: 'The cron job failed to execute the full pipeline.',
      error: error.message,
    });
  }
} 