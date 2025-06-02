const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Store the last execution result in memory
let cachedData = null;
let lastExecutionTime = null;

// API route for Dune data
app.get('/api/dune', async (req, res) => {
  try {
    const DUNE_API_KEY = process.env.DUNE_API_KEY;
    const DUNE_QUERY_ID = '5199320';

    if (!DUNE_API_KEY) {
      return res.status(500).json({ error: 'DUNE_API_KEY not found in environment variables' });
    }

    // Check if we have cached data that's less than 12 hours old
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    
    if (cachedData && lastExecutionTime && lastExecutionTime > twelveHoursAgo) {
      console.log('Returning cached data from:', lastExecutionTime);
      return res.json(cachedData);
    }

    console.log('Executing fresh query on Dune...');
    
    // Import fetch dynamically for Node.js
    const fetch = (await import('node-fetch')).default;
    
    // Execute the query
    const executeResponse = await fetch(`https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/execute`, {
      method: 'POST',
      headers: {
        'X-Dune-API-Key': DUNE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        performance: 'medium' // 10 credits per execution
      })
    });

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();
      console.error('Dune Execute Error:', errorText);
      return res.status(executeResponse.status).json({ error: `Dune execute error: ${executeResponse.status}` });
    }

    const executeData = await executeResponse.json();
    const executionId = executeData.execution_id;
    
    console.log('Query executing with ID:', executionId);

    // Poll for results (wait for execution to complete)
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 5 minutes
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
      
      console.log(`Checking execution status... (attempt ${attempts}/${maxAttempts})`);
      
      const statusResponse = await fetch(`https://api.dune.com/api/v1/execution/${executionId}/results`, {
        method: 'GET',
        headers: {
          'X-Dune-API-Key': DUNE_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (statusResponse.ok) {
        const data = await statusResponse.json();
        
        if (data.state === 'QUERY_STATE_COMPLETED') {
          console.log('Query completed! Rows returned:', data.result?.rows?.length || 0);
          
          // Cache the result
          cachedData = data;
          lastExecutionTime = new Date();
          
          return res.json(data);
        } else if (data.state === 'QUERY_STATE_FAILED') {
          console.error('Query failed:', data);
          return res.status(500).json({ error: 'Query execution failed' });
        }
        
        console.log('Query still running, state:', data.state);
      }
    }
    
    return res.status(408).json({ error: 'Query execution timeout' });
    
  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Manual refresh endpoint (for when you want to force a refresh)
app.post('/api/refresh', async (req, res) => {
  console.log('Manual refresh requested');
  cachedData = null;
  lastExecutionTime = null;
  res.redirect('/api/dune');
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📊 Dune API Key configured: ${process.env.DUNE_API_KEY ? 'Yes' : 'No'}`);
  console.log(`💰 Will execute query max twice per day (costs 10 credits each)`);
});
