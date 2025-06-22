import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint to trigger daily data collection and prediction analysis.
 * This should be called by a cron job once a day.
 *
 * In a production environment, this endpoint should be secured with a secret key
 * to prevent unauthorized access.
 */
export const config = {
  maxDuration: 540, // 9 minutes, to accommodate multiple sequential API calls
};

// Helper function to make API calls and handle errors
async function triggerPipelineStep(step: 'data' | 'predictions', date: string, pythonApiUrl: string) {
  const url = `${pythonApiUrl}/${step}/${date}`;
  const method = step === 'data' ? 'POST' : 'GET';
  
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
    results.today.data = await triggerPipelineStep('data', todayStr, pythonApiUrl);
    results.tomorrow.data = await triggerPipelineStep('data', tomorrowStr, pythonApiUrl);
    results.today.predictions = await triggerPipelineStep('predictions', todayStr, pythonApiUrl);
    results.tomorrow.predictions = await triggerPipelineStep('predictions', tomorrowStr, pythonApiUrl);

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