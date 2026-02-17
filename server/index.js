const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
// IMPORT YOUR NEW LOGIC HERE:
const { dealCards } = require('./gameLogic'); 

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Create an object to track which players are in which rooms
const rooms = {};

io.on('connection', (socket) => {
  console.log(`A player connected: ${socket.id}`);

  socket.on('joinRoom', (roomCode) => {
    socket.join(roomCode);
    
    // If the room doesn't exist in our tracker yet, create it
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [] };
    }
    
    // Add the player to the room tracker if they aren't already in it
    if (!rooms[roomCode].players.includes(socket.id)) {
      rooms[roomCode].players.push(socket.id);
    }

    console.log(`Player ${socket.id} joined room: ${roomCode}`);
    io.to(roomCode).emit('playerJoined', socket.id);
  });

  // NEW: Listen for when someone clicks "Start Game"
  socket.on('startGame', (roomCode) => {
    const playersInRoom = rooms[roomCode].players;
    
    // In Mendicot, you need exactly 4 players, but for testing, let's allow 2-4
    if (playersInRoom.length >= 2 && playersInRoom.length <= 4) {
      const hands = dealCards(playersInRoom);
      
      // Send each player ONLY their specific hand securely
      playersInRoom.forEach(playerId => {
        io.to(playerId).emit('receiveCards', hands[playerId]);
      });
      
      console.log(`Game started in room ${roomCode}. Cards dealt!`);
    } else {
      socket.emit('errorMsg', 'Need between 2 and 4 players to start.');
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    // Note: We will add logic later to remove them from the 'rooms' tracker
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Dealer is ready! Server listening on port ${PORT}`);
});