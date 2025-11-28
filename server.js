// server.js
// WebSocket Relay Server for RPi Camera Streaming

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
    console.log('✓ RPi camera connected');
    rpiConnection = ws;
    
    let frameCount = 0;
    
    ws.on('message', (data) => {
      frameCount++;
      
      // Log every 30 frames
      if (frameCount % 30 === 0) {
        console.log(`✓ Received ${frameCount} frames from RPi | Broadcasting to ${browserClients.size} clients`);
      }
      
      // Broadcast frame to all browser clients
      let sent = 0;
      browserClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
          sent++;
        }
      });
      
      if (frameCount === 1) {
        console.log(`✓ First frame broadcasted to ${sent} browser client(s)`);
      }
    });
    
    ws.on('close', () => {
      console.log('✗ RPi camera disconnected');
      rpiConnection = null;
    });
  } else {
    console.log('✓ Browser client connected');
    browserClients.add(ws);
    
    ws.on('close', () => {
      console.log('✗ Browser client disconnected');
      browserClients.delete(ws);
    });
    
    // Send status
    ws.send(JSON.stringify({
      type: 'status',
      connected: !!rpiConnection,
      message: rpiConnection ? 'Camera is streaming' : 'Waiting for camera...'
    }));
  }
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log('WebSocket relay server started');