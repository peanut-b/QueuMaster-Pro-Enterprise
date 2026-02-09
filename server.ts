
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

// Central data storage (replaces localStorage)
const centralData = {
  tickets: [] as any[],
  categories: [] as any[],
  tellers: [] as any[],
  adminAccounts: [] as any[]
};

// Load initial data if available
try {
  // You can load from a file or database here
  // For now, we'll start with empty arrays
} catch (error) {
  console.log('Starting with empty central data');
}

// Function to broadcast to all clients
const broadcast = (data: any, sender?: WebSocket) => {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Function to save data to central storage
const saveData = (type: string, data: any) => {
  switch (type) {
    case 'ticket':
      const existingTicketIndex = centralData.tickets.findIndex(t => t.id === data.id);
      if (existingTicketIndex >= 0) {
        centralData.tickets[existingTicketIndex] = data;
      } else {
        centralData.tickets.push(data);
      }
      break;
    case 'teller':
      const existingTellerIndex = centralData.tellers.findIndex(t => t.id === data.id);
      if (existingTellerIndex >= 0) {
        centralData.tellers[existingTellerIndex] = data;
      } else {
        centralData.tellers.push(data);
      }
      break;
    case 'category':
      const existingCategoryIndex = centralData.categories.findIndex(c => c.id === data.id);
      if (existingCategoryIndex >= 0) {
        centralData.categories[existingCategoryIndex] = data;
      } else {
        centralData.categories.push(data);
      }
      break;
    case 'admin_account':
      const existingAdminIndex = centralData.adminAccounts.findIndex(a => a.id === data.id);
      if (existingAdminIndex >= 0) {
        centralData.adminAccounts[existingAdminIndex] = data;
      } else {
        centralData.adminAccounts.push(data);
      }
      break;
  }
  
  // Log data changes
  console.log(`Updated ${type}:`, data.id);
};

wss.on('connection', (ws, req) => {
  // Get client IP
  const ip = req.socket.remoteAddress;
  console.log(`New connection from ${ip}`);
  
  // Add to clients set
  clients.add(ws);
  
  // Send initial data to new client
  ws.send(JSON.stringify({
    type: 'sync',
    tickets: centralData.tickets,
    categories: centralData.categories,
    tellers: centralData.tellers,
    adminAccounts: centralData.adminAccounts,
    timestamp: Date.now()
  }));
  
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
          // Save to central storage
          saveData('ticket', data.ticket);
          
          // Broadcast to all clients
          broadcast({
            type: 'ticket_update',
            ticket: data.ticket
          }, ws);
          break;
          
        case 'teller_update':
          // Save to central storage
          saveData('teller', data.teller);
          
          // Broadcast to all clients
          broadcast({
            type: 'teller_update',
            teller: data.teller
          }, ws);
          break;
          
        case 'category_update':
          // Save to central storage
          saveData('category', data.category);
          
          // Broadcast to all clients
          broadcast({
            type: 'category_update',
            category: data.category
          }, ws);
          break;
          
        case 'admin_account_update':
          // Save to central storage
          saveData('admin_account', data.account);
          
          // Broadcast to all clients
          broadcast({
            type: 'admin_account_update',
            account: data.account
          }, ws);
          break;
          
        case 'ping':
          // Respond to ping
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
          
        case 'request_sync':
          // Send full sync
          ws.send(JSON.stringify({
            type: 'sync',
            tickets: centralData.tickets,
            categories: centralData.categories,
            tellers: centralData.tellers,
            adminAccounts: centralData.adminAccounts,
            timestamp: Date.now()
          }));
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

// Clean up old tickets periodically (older than 24 hours)
setInterval(() => {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  const oldCount = centralData.tickets.length;
  centralData.tickets = centralData.tickets.filter(ticket => 
    ticket.createdAt > oneDayAgo
  );
  
  if (oldCount !== centralData.tickets.length) {
    console.log(`Cleaned up ${oldCount - centralData.tickets.length} old tickets`);
  }
}, 3600000); // Every hour

// Save data to file periodically (optional)
setInterval(() => {
  // You can implement file saving here for persistence across server restarts
  // For now, we keep data in memory only
}, 300000); // Every 5 minutes

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`QueueMaster Pro WebSocket Server running on port ${PORT}`);
  console.log(`HTTP server: http://localhost:${PORT}`);
  console.log(`WebSocket server: ws://localhost:${PORT}`);
  console.log(`Central storage initialized with:`);
  console.log(`- Tickets: ${centralData.tickets.length}`);
  console.log(`- Categories: ${centralData.categories.length}`);
  console.log(`- Tellers: ${centralData.tellers.length}`);
  console.log(`- Admin Accounts: ${centralData.adminAccounts.length}`);
});
