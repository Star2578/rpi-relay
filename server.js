// WebSocket Relay Server (Node.js)
// Deploy on Railway, Render, or any VPS
// Install: npm install ws express cors

const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', clients: wss.clients.size });
});

const server = app.listen(PORT, () => {
  console.log(`Relay server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

let rpiConnection = null;
const browserClients = new Set();

wss.on('connection', (ws, req) => {
  const isRPi = req.headers['user-agent']?.includes('Python') || 
                req.url?.includes('?source=rpi');
  
  if (isRPi) {
    console.log('RPi camera connected');
    rpiConnection = ws;
    
    ws.on('message', (data) => {
      // Broadcast frame to all browser clients
      browserClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    });
    
    ws.on('close', () => {
      console.log('RPi camera disconnected');
      rpiConnection = null;
    });
  } else {
    console.log('Browser client connected');
    browserClients.add(ws);
    
    ws.on('close', () => {
      console.log('Browser client disconnected');
      browserClients.delete(ws);
    });
    
    // Send status
    ws.send(JSON.stringify({
      type: 'status',
      connected: !!rpiConnection
    }));
  }
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log('WebSocket relay server started');