const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import game logic for dealing cards
const { dealCards } = require('./gameLogic'); 

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"]
  }
});

// Object to track all active rooms, their players, and the center table
const rooms = {};

io.on('connection', (socket) => {
  console.log(`A player connected: ${socket.id}`);

  // 1. Handle joining a room (Now expecting an object with roomCode and nickname)
  socket.on('joinRoom', ({ roomCode, nickname }) => {
    socket.join(roomCode);
    
    // Initialize the room if it doesn't exist
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], table: [] };
    }
    
    // Add the player if they aren't already in the room
    const playerExists = rooms[roomCode].players.find(p => p.id === socket.id);
    if (!playerExists) {
      rooms[roomCode].players.push({ id: socket.id, name: nickname });
    }

    console.log(`${nickname} (${socket.id}) joined room: ${roomCode}`);
    
    // Broadcast the updated list of players to everyone in that specific room
    io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
  });

  // 2. Handle starting the game and dealing cards
  socket.on('startGame', (roomCode) => {
    if (!rooms[roomCode]) return;

    const playersInRoom = rooms[roomCode].players;
    
    // For testing, we allow 2 to 12 players
    if (playersInRoom.length >= 2) {
      // Extract just the IDs to pass into our dealing function
      const playerIds = playersInRoom.map(p => p.id);
      const hands = dealCards(playerIds);
      
      // Send each player ONLY their specific hand securely
      playerIds.forEach(playerId => {
        io.to(playerId).emit('receiveCards', hands[playerId]);
      });
      
      console.log(`Game started in room ${roomCode}. Cards dealt!`);
    } else {
      socket.emit('errorMsg', 'Need at least 2 players to start.');
    }
  });

  // 3. Handle playing a card to the center table
  socket.on('playCard', ({ roomCode, card }) => {
    if (rooms[roomCode]) {
      // Add the card to the table, attaching the player's ID
      rooms[roomCode].table.push({ ...card, playerId: socket.id });
      
      // Broadcast the new table state to everyone in the room
      io.to(roomCode).emit('updateTable', rooms[roomCode].table);
    }
  });

  // 4. Handle a player disconnecting (closing tab, losing internet)
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    // Search through all rooms to find where this player was sitting
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        // Remove the player from the array
        room.players.splice(playerIndex, 1);
        
        // Tell everyone else in the room to update their UI (removes the seat)
        io.to(roomCode).emit('updatePlayers', room.players);
        
        // Optional: If the room is empty, clean it up from the server's memory
        if (room.players.length === 0) {
          delete rooms[roomCode];
          console.log(`Room ${roomCode} deleted (empty)`);
        }
        break; // Stop searching once we found them
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Dealer is ready! Server listening on port ${PORT}`);
});