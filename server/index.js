const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
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

const rooms = {};

io.on('connection', (socket) => {
  console.log(`A player connected: ${socket.id}`);

  socket.on('joinRoom', ({ roomCode, nickname }) => {
    socket.join(roomCode);
    
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], table: [], currentTurnIndex: 0 };
    }
    
    const playerExists = rooms[roomCode].players.find(p => p.id === socket.id);
    if (!playerExists) {
      // NEW: Added team property (starts as null)
      rooms[roomCode].players.push({ id: socket.id, name: nickname, team: null });
    }
    
    io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
  });

  // NEW: Handle a player picking Team A or Team B
  socket.on('joinTeam', ({ roomCode, team }) => {
    const room = rooms[roomCode];
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.team = team;
        io.to(roomCode).emit('updatePlayers', room.players);
      }
    }
  });

  socket.on('startGame', (roomCode) => {
    if (!rooms[roomCode]) return;
    const playersInRoom = rooms[roomCode].players;
    
    // Check if everyone has picked a team before starting
    const unassignedPlayers = playersInRoom.filter(p => !p.team);
    if (unassignedPlayers.length > 0) {
      return socket.emit('errorMsg', 'Everyone must pick a team before starting!');
    }

    if (playersInRoom.length >= 4 && playersInRoom.length % 2 === 0) {
      const playerIds = playersInRoom.map(p => p.id);
      const hands = dealCards(playerIds);
      
      playerIds.forEach(playerId => {
        io.to(playerId).emit('receiveCards', hands[playerId]);
      });

      rooms[roomCode].currentTurnIndex = 0; 
      io.to(roomCode).emit('turnUpdate', playersInRoom[0].id); 
    } else {
      socket.emit('errorMsg', 'Need an even number of players (4, 6, 8, 10, 12) to play Mendicot teams.');
    }
  });

  socket.on('playCard', ({ roomCode, card }) => {
    const room = rooms[roomCode];
    if (room) {
      const activePlayerId = room.players[room.currentTurnIndex].id;
      if (socket.id !== activePlayerId) return socket.emit('errorMsg', "Wait for your turn!");

      room.table.push({ ...card, playerId: socket.id });
      io.to(roomCode).emit('updateTable', room.table);

      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
      io.to(roomCode).emit('turnUpdate', room.players[room.currentTurnIndex].id);
    }
  });

  socket.on('disconnect', () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        io.to(roomCode).emit('updatePlayers', room.players);
        if (room.players.length === 0) delete rooms[roomCode];
        break; 
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Dealer is ready! Server listening on port ${PORT}`));