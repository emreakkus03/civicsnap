export default async ({ req, res, log, error }) => {
  if (req.headers['x-appwrite-trigger'] === 'schedule') {
    log('Ping received.');
    return res.json({ success: true, message: 'Pong' }, 200);
  }

  if (!process.env.GOOGLE_VISION_API_KEY) {
    error('Configuration Error: Missing GOOGLE_VISION_API_KEY environment variable.');
    return res.json({ success: false, error: 'Server configuration error' }, 500);
  }

  if (req.method !== 'POST') {
    return res.json({ success: false, error: 'Method not allowed. Use POST.' }, 405);
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const base64String = payload.base64;

    if (!base64String) {
      error('Validation Error: No base64 image data provided in the request body.');
      return res.json({ success: false, error: 'Missing image data' }, 400);
    }

    log('Starting Google Cloud Vision analysis...');

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    const googleResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64String },
              features: [{ type: 'LABEL_DETECTION', maxResults: 10 }],
            },
          ],
        }),
      }
    );

    if (!googleResponse.ok) {
      const errorData = await googleResponse.json();
      error(`Google Vision API Error: ${JSON.stringify(errorData)}`);
      return res.json({ success: false, error: 'Google API communication failed' }, 502);
    }

    const data = await googleResponse.json();
    log('Successfully retrieved AI labels from Google.');

    return res.json({
      success: true,
      responses: data.responses
    });

  } catch (err) {
    error(`Internal Server Error during execution: ${err.message}`);
    return res.json({ success: false, error: 'Internal server error' }, 500);
  }
};