// api/dune.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const DUNE_API_KEY = process.env.DUNE_API_KEY;
    const DUNE_QUERY_ID = '5199982';

    if (!DUNE_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch(`https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results`, {
      method: 'GET',
      headers: {
        'X-Dune-API-Key': DUNE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dune API Error:', errorText);
      return res.status(response.status).json({ error: `Dune API error: ${response.status}` });
    }

    const data = await response.json();
    
    // Return the data
    res.status(200).json(data);
    
  } catch (error) {
    console.error('API Route Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
