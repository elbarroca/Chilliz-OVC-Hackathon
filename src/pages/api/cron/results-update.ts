import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API endpoint to trigger the results update process.
 * This should be called by a cron job frequently.
 */
export const config = {
  maxDuration: 55, // 55 seconds, to stay within hobby plan limits (60s)
};

async function triggerResultsUpdate(pythonApiUrl: string) {
  const url = `${pythonApiUrl}/results/update`;
  console.log(`[CRON-RESULTS] Triggering results update at: ${url}`);
  
  const response = await fetch(url, { method: 'POST' });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[CRON-RESULTS] Results update failed: ${response.status}`, errorText);
    throw new Error(`Results update API returned an error: ${errorText}`);
  }

  const responseData = await response.json();
  console.log(`[CRON-RESULTS] Results update successful.`);
  return responseData;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { authorization } = req.headers;
  if (process.env.CRON_SECRET && authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

  try {
    const result = await triggerResultsUpdate(pythonApiUrl);
    res.status(200).json({
      message: 'Results update triggered successfully.',
      result
    });
  } catch (error: any) {
    console.error('[CRON-RESULTS] The results update job failed.', error);
    res.status(500).json({
      message: 'The results update cron job failed.',
      error: error.message,
    });
  }
} 