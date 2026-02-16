// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Allows your React app to talk to this server

const server = http.createServer(app);

// Initialize Socket.io and allow your React frontend to connect
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // This is the default Vite React port
    methods: ["GET", "POST"]
  }
});

// The main event loop for connected players
io.on('connection', (socket) => {
  console.log(`A player connected: ${socket.id}`);

  // You will eventually add your Mendicot game logic here!
  // socket.on('joinRoom', ...)
  // socket.on('playCard', ...)

  // When a player closes the tab or loses internet
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Dealer is ready! Server listening on port ${PORT}`);
});