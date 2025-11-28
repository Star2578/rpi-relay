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
        console.log(`✓ Received ${frameCount} frames from RPi | Broadcasting to ${browserClients.size} clients | Data type: ${typeof data}, Length: ${data.length}`);
      }
      
      // Broadcast frame to all browser clients
      let sent = 0;
      browserClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            // Send data as-is (could be string or buffer)
            client.send(data);
            sent++;
          } catch (err) {
            console.error('Error sending to client:', err);
          }
        }
      });
      
      if (frameCount === 1) {
        console.log(`✓ First frame broadcasted to ${sent} browser client(s)`);
        console.log(`   Data preview: ${data.toString().substring(0, 50)}...`);
      }
    });
    
    ws.on('close', () => {
      console.log('✗ RPi camera disconnected');
      rpiConnection = null;
    });
  } else {
    console.log('✓ Browser client connected');
    browserClients.add(ws);
    
    // Log incoming messages from browser for debugging
    ws.on('message', (data) => {
      console.log('📨 Message from browser:', data.toString());
    });
    
    ws.on('close', () => {
      console.log('✗ Browser client disconnected');
      browserClients.delete(ws);
    });
    
    // Send status immediately
    const statusMsg = JSON.stringify({
      type: 'status',
      connected: !!rpiConnection,
      message: rpiConnection ? 'Camera is streaming' : 'Waiting for camera...'
    });
    
    ws.send(statusMsg);
    console.log('📤 Sent status to browser:', statusMsg);
  }
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log('WebSocket relay server started');