const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { dealCards, evaluateTrick } = require('./gameLogic'); 

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log(`A player connected: ${socket.id}`);

  socket.on('joinRoom', ({ roomCode, nickname }) => {
    socket.join(roomCode);
    if (!rooms[roomCode]) {
      rooms[roomCode] = { 
        players: [], table: [], currentTurnIndex: 0,
        teamAScore: 0, teamBScore: 0, trumpSuit: null,
        trumpMakerId: null, tricksPlayed: 0,
        hostId: socket.id // NEW: The person who creates the room is the Host!
      };
    }
    
    const playerExists = rooms[roomCode].players.find(p => p.id === socket.id);
    if (!playerExists) rooms[roomCode].players.push({ id: socket.id, name: nickname, team: null });
    
    io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
    io.to(roomCode).emit('updateHost', rooms[roomCode].hostId); // NEW: Tell everyone who the host is
  });

  socket.on('joinTeam', ({ roomCode, team }) => {
    const room = rooms[roomCode];
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) { player.team = team; io.to(roomCode).emit('updatePlayers', room.players); }
    }
  });

  socket.on('startGame', (roomCode) => {
    if (!rooms[roomCode]) return;
    const room = rooms[roomCode];

    // NEW SECURITY CHECK: Reject if anyone but the host tries to start the game
    if (socket.id !== room.hostId) {
      return socket.emit('errorMsg', 'Only the Host can start the game!');
    }

    const playersInRoom = room.players;
    
    if (playersInRoom.filter(p => !p.team).length > 0) return socket.emit('errorMsg', 'Everyone must pick a team!');

    if (playersInRoom.length >= 4 && playersInRoom.length % 2 === 0) {
      const teamA = playersInRoom.filter(p => p.team === 'A');
      const teamB = playersInRoom.filter(p => p.team === 'B');
      if (teamA.length !== teamB.length) return socket.emit('errorMsg', 'Teams must be equal!');

      let interleaved = [];
      for (let i = 0; i < teamA.length; i++) { interleaved.push(teamA[i]); interleaved.push(teamB[i]); }
      room.players = interleaved;
      io.to(roomCode).emit('updatePlayers', interleaved);

      const playerIds = interleaved.map(p => p.id);
      const hands = dealCards(playerIds);
      playerIds.forEach(playerId => io.to(playerId).emit('receiveCards', hands[playerId]));

      room.currentTurnIndex = 0; 
      room.tricksPlayed = 0;
      io.to(roomCode).emit('turnUpdate', interleaved[0].id); 
    } else {
      socket.emit('errorMsg', 'Need an even number of players (4, 6, 8, 10, 12).');
    }
  });

  socket.on('playCard', ({ roomCode, card }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const activePlayerId = room.players[room.currentTurnIndex].id;
    if (socket.id !== activePlayerId) return socket.emit('errorMsg', "Wait for your turn!");

    if (room.table.length > 0 && room.trumpSuit === null) {
      const leadSuit = room.table[0].suit;
      if (card.suit !== leadSuit) {
        room.trumpSuit = card.suit;
        room.trumpMakerId = socket.id; 
        io.to(roomCode).emit('trumpUpdate', room.trumpSuit);
      }
    }

    room.table.push({ ...card, playerId: socket.id });
    io.to(roomCode).emit('updateTable', room.table);

    if (room.table.length === room.players.length) {
      const winnerId = evaluateTrick(room.table, room.trumpSuit);
      const winner = room.players.find(p => p.id === winnerId);

      const tensInTrick = room.table.filter(c => c.value === '10').length;
      if (tensInTrick > 0) {
        if (winner.team === 'A') room.teamAScore += tensInTrick;
        if (winner.team === 'B') room.teamBScore += tensInTrick;
      }
      io.to(roomCode).emit('scoreUpdate', { A: room.teamAScore, B: room.teamBScore });

      setTimeout(() => {
        room.table = []; 
        room.tricksPlayed += 1;
        
        let totalCards = 52;
        if ([6, 8, 12].includes(room.players.length)) totalCards = 48;
        if (room.players.length === 10) totalCards = 50;
        const maxTricks = totalCards / room.players.length;

        if (room.tricksPlayed >= maxTricks) {
          let msg = room.teamAScore > room.teamBScore ? "Team A wins the hand!" : room.teamBScore > room.teamAScore ? "Team B wins the hand!" : "It's a tie!";
          io.to(roomCode).emit('roundOver', msg); 

          setTimeout(() => {
            room.tricksPlayed = 0; room.teamAScore = 0; room.teamBScore = 0; room.trumpSuit = null;
            io.to(roomCode).emit('scoreUpdate', { A: 0, B: 0 });
            io.to(roomCode).emit('trumpUpdate', null);

            if (room.trumpMakerId) {
              const makerIndex = room.players.findIndex(p => p.id === room.trumpMakerId);
              room.currentTurnIndex = makerIndex !== -1 ? makerIndex : 0;
            } else {
              room.currentTurnIndex = 0;
            }
            room.trumpMakerId = null; 

            const playerIds = room.players.map(p => p.id);
            const hands = dealCards(playerIds);
            playerIds.forEach(playerId => io.to(playerId).emit('receiveCards', hands[playerId]));
            
            io.to(roomCode).emit('updateTable', []);
            io.to(roomCode).emit('turnUpdate', room.players[room.currentTurnIndex].id);
          }, 5000);

        } else {
          room.currentTurnIndex = room.players.findIndex(p => p.id === winnerId);
          io.to(roomCode).emit('updateTable', room.table);
          io.to(roomCode).emit('turnUpdate', room.players[room.currentTurnIndex].id);
        }
      }, 3000);

    } else {
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
        
        // NEW: If the room is empty, delete it. If the host leaves, pass host to the next person!
        if (room.players.length === 0) {
          delete rooms[roomCode];
        } else if (room.hostId === socket.id) {
          room.hostId = room.players[0].id;
          io.to(roomCode).emit('updateHost', room.hostId);
        } else {
          io.to(roomCode).emit('updatePlayers', room.players);
        }
        break; 
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Dealer is ready! Server listening on port ${PORT}`));