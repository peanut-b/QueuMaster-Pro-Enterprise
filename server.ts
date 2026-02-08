
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';

// Create HTTP server
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('QueueMaster Pro WebSocket Server');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set<WebSocket>();
const broadcastData = new Map<string, any>();

// Function to broadcast to all clients except sender
const broadcast = (data: any, sender?: WebSocket) => {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

wss.on('connection', (ws, req) => {
  // Get client IP
  const ip = req.socket.remoteAddress;
  console.log(`New connection from ${ip}`);
  
  // Add to clients set
  clients.add(ws);
  
  // Send initial data to new client
  const initialData = {
    type: 'sync',
    tickets: Array.from(broadcastData.entries()).filter(([key]) => 
      key.startsWith('ticket:')
    ).map(([, value]) => value),
    categories: JSON.parse(localStorage.getItem('q_categories') || '[]'),
    tellers: JSON.parse(localStorage.getItem('q_tellers') || '[]')
  };
  
  ws.send(JSON.stringify(initialData));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'announce':
          // Broadcast announcement to all clients
          broadcast({
            type: 'announce',
            ticketNumber: data.ticketNumber,
            counterNumber: data.counterNumber,
            timestamp: Date.now()
          }, ws);
          break;
          
        case 'ticket_update':
          // Store ticket update
          broadcastData.set(`ticket:${data.ticket.id}`, data.ticket);
          
          // Broadcast to all clients
          broadcast({
            type: 'ticket_update',
            ticket: data.ticket
          }, ws);
          break;
          
        case 'teller_update':
          // Broadcast teller status update
          broadcast({
            type: 'teller_update',
            teller: data.teller
          }, ws);
          break;
          
        case 'category_update':
          // Broadcast category update
          broadcast({
            type: 'category_update',
            category: data.category
          }, ws);
          break;
          
        case 'ping':
          // Respond to ping
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log(`Connection closed from ${ip}`);
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to QueueMaster Pro Server',
    clientCount: clients.size,
    timestamp: Date.now()
  }));
});

// Clean up old data periodically
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  for (const [key, data] of broadcastData.entries()) {
    if (data.timestamp && data.timestamp < oneHourAgo) {
      broadcastData.delete(key);
    }
  }
}, 300000); // Every 5 minutes

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`QueueMaster Pro WebSocket Server running on port ${PORT}`);
  console.log(`HTTP server: http://localhost:${PORT}`);
  console.log(`WebSocket server: ws://localhost:${PORT}`);
});
