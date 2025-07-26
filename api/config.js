export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return the API keys from environment variables
  res.status(200).json({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || ''
  });
}