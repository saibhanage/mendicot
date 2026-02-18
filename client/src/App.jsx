import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

// Connect to the backend server
const socket = io('http://localhost:3001')

function App() {
  // Socket Connection State
  const [isConnected, setIsConnected] = useState(socket.connected)
  
  // UI & Game State
  const [view, setView] = useState('landing') // views: 'landing', 'create', 'join', 'table'
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [playersInRoom, setPlayersInRoom] = useState(0)

  // Listeners for real-time events
  useEffect(() => {
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    // When someone joins the room, increment our player counter
    socket.on('playerJoined', () => {
      setPlayersInRoom(prev => prev + 1)
    })

    // Cleanup listeners when component unmounts
    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('playerJoined')
    }
  }, [])

  // Action: Create a brand new game table
  const handleCreateGame = () => {
    if (!nickname) return alert("Please enter a nickname!")
    
    // Generate a random 6-character room code (e.g., "X7B9WQ")
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomCode(newCode)
    
    socket.emit('joinRoom', newCode)
    setView('table')
    setPlayersInRoom(1) // You are the first person in the room
  }

  // Action: Join an existing game table
  const handleJoinGame = () => {
    if (!nickname || !roomCode) return alert("Enter nickname and room code!")
    
    socket.emit('joinRoom', roomCode)
    setView('table')
    setPlayersInRoom(2) // Fake it for the UI for now
  }

  // Action: Copy link to clipboard
  const copyInviteLink = () => {
    navigator.clipboard.writeText(`Join my Mendicot game! Room Code: ${roomCode}`)
    alert("Copied to clipboard!")
  }

  // FAKE PLAYERS for UI testing 
  // (Try adding more names to this array up to 12 to see the table dynamically resize!)
  const dummyPlayers = [
    { id: 1, name: nickname || 'You' },
    { id: 2, name: 'Alex' },
    { id: 3, name: 'Sam' },
    { id: 4, name: 'Jordan' },
    { id: 5, name: 'Taylor' },
    { id: 6, name: 'Casey' },
    { id: 7, name: 'Riley' },
    { id: 8, name: 'Morgan' }
  ];

  return (
    <div className="app-container">
      
      {/* Top Status Bar */}
      <div className="status-bar">
        <span>MENDICOT ONLINE</span>
        <span>{isConnected ? '🟢 Server Online' : '🔴 Server Offline'}</span>
      </div>

      {/* VIEW 1: The Landing Page */}
      {view === 'landing' && (
        <div className="landing-container">
          <div className="action-card">
            <h2>no download <strong>free online mendicot</strong> with your friends!</h2>
            <button className="btn-primary" onClick={() => setView('create')}>
              START A NEW GAME
            </button>
          </div>
          
          <div className="action-card">
            <h2>play with the community in <strong>Clubs, Games and Freerolls</strong></h2>
            <button className="btn-secondary" onClick={() => setView('join')}>
              FIND A GAME
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: The "Create" Menu */}
      {view === 'create' && (
        <div className="landing-container">
          <div className="action-card">
            <h3>N E W &nbsp; G A M E</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Play free private online mendicot with your friends. No download needed.</p>
            <input 
              className="modern-input" 
              placeholder="Your Nickname" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button className="btn-primary" onClick={handleCreateGame}>CREATE GAME</button>
          </div>
        </div>
      )}

      {/* VIEW 3: The "Join" Menu */}
      {view === 'join' && (
        <div className="landing-container">
          <div className="action-card">
            <h3>J O I N &nbsp; G A M E</h3>
            <input 
              className="modern-input" 
              placeholder="Your Nickname" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <input 
              className="modern-input" 
              placeholder="Room Code" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button className="btn-secondary" onClick={handleJoinGame}>JOIN GAME</button>
          </div>
        </div>
      )}

      {/* VIEW 4: The Game Table */}
      {view === 'table' && (
        <div className="table-container">
          <div className="poker-table">
            
            {/* The "Waiting for others" popup box sitting on the table */}
            {playersInRoom < 4 && (
              <div className="waiting-modal">
                <h3>⏱ Waiting for others ({playersInRoom}/12)</h3>
                <p>Share this code with your friends!</p>
                <h2 style={{ letterSpacing: '5px', margin: '15px 0' }}>{roomCode}</h2>
                <button className="btn-primary" onClick={copyInviteLink} style={{ padding: '10px 20px', fontSize: '1rem' }}>
                  COPY LINK
                </button>
              </div>
            )}

            {/* DYNAMIC SEATING: Maps players perfectly around the oval table */}
            {dummyPlayers.map((player, index) => {
              // Mathematical calculation to distribute seats evenly in a circle
              const totalPlayers = dummyPlayers.length;
              // Start at top (-90 degrees / -Math.PI/2) and spread evenly
              const angle = (index / totalPlayers) * 2 * Math.PI - (Math.PI / 2);
              
              // 50 is center. Multiply by 50 to push them to the edge of the container
              const leftPos = 50 + 50 * Math.cos(angle);
              const topPos = 50 + 50 * Math.sin(angle);

              return (
                <div 
                  key={player.id} 
                  className="table-seat"
                  style={{ left: `${leftPos}%`, top: `${topPos}%` }}
                >
                  <div className="seat-avatar"></div>
                  <div className="seat-name">{player.name}</div>
                </div>
              );
            })}

          </div>
        </div>
      )}

    </div>
  )
}

export default App