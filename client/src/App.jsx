import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const socket = io('http://localhost:3001')

function App() {
  // --- STATE ---
  const [isConnected, setIsConnected] = useState(socket.connected)
  const [view, setView] = useState('landing') // 'landing', 'create', 'join', 'table'
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  
  // Real-time Game State
  const [playersList, setPlayersList] = useState([])
  const [hand, setHand] = useState([])
  const [tableCards, setTableCards] = useState([])

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    // Update the seats when people join/leave
    socket.on('updatePlayers', (players) => {
      setPlayersList(players)
    })

    // Receive 13 cards from the dealer
    socket.on('receiveCards', (cards) => {
      setHand(cards)
    })

    // See cards played to the center table
    socket.on('updateTable', (tableData) => {
      setTableCards(tableData)
    })

    // Handle errors (like trying to start with 1 person)
    socket.on('errorMsg', (msg) => {
      alert(msg)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('updatePlayers')
      socket.off('receiveCards')
      socket.off('updateTable')
      socket.off('errorMsg')
    }
  }, [])

  // --- ACTIONS ---
  const handleCreateGame = () => {
    if (!nickname) return alert("Please enter a nickname!")
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomCode(newCode)
    socket.emit('joinRoom', { roomCode: newCode, nickname })
    setView('table')
  }

  const handleJoinGame = () => {
    if (!nickname || !roomCode) return alert("Enter nickname and room code!")
    socket.emit('joinRoom', { roomCode, nickname })
    setView('table')
  }

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`Join my Mendicot game! Room Code: ${roomCode}`)
    alert("Copied to clipboard!")
  }

  const startGame = () => {
    socket.emit('startGame', roomCode)
  }

  const playCard = (cardToPlay) => {
    // 1. Remove from local hand visually immediately
    setHand(hand.filter(c => !(c.suit === cardToPlay.suit && c.value === cardToPlay.value)))
    // 2. Tell the server to broadcast it to the table
    socket.emit('playCard', { roomCode, card: cardToPlay })
  }

  // --- HELPERS ---
  const getSuitColor = (suit) => (suit === 'Hearts' || suit === 'Diamonds' ? '#ef4444' : '#111827')
  const getSuitSymbol = (suit) => {
    switch(suit) {
      case 'Hearts': return '♥';
      case 'Diamonds': return '♦';
      case 'Clubs': return '♣';
      case 'Spades': return '♠';
      default: return '';
    }
  }

  return (
    <div className="app-container">
      
      {/* Top Status Bar */}
      <div className="status-bar">
        <span>MENDICOT ONLINE</span>
        <span>{isConnected ? '🟢 Server Online' : '🔴 Server Offline'}</span>
      </div>

      {/* VIEW 1: Landing Page */}
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

      {/* VIEW 2: Create Menu */}
      {view === 'create' && (
        <div className="landing-container">
          <div className="action-card">
            <h3>N E W &nbsp; G A M E</h3>
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

      {/* VIEW 3: Join Menu */}
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
        <div className="table-container" style={{ flexDirection: 'column' }}>
          
          <div className="poker-table">
            
            {/* Modal in the center of the table (Only shows before cards are dealt) */}
            {hand.length === 0 && (
              <div className="waiting-modal">
                <h3>Room: {roomCode}</h3>
                <p>Players: {playersList.length}/12</p>
                <button className="btn-secondary" onClick={copyInviteLink} style={{ padding: '8px 16px', fontSize: '0.9rem', marginBottom: '15px' }}>
                  COPY LINK
                </button>
                <br/>
                {/* Show start game button if there are at least 2 people */}
                {playersList.length >= 2 ? (
                  <button className="btn-primary" onClick={startGame}>START GAME & DEAL</button>
                ) : (
                  <p style={{ color: '#666', fontSize: '0.9rem' }}>Waiting for more players to start...</p>
                )}
              </div>
            )}

            {/* The Center Trick Area (Shows cards played by players) */}
            {tableCards.length > 0 && (
              <div className="center-trick-area" style={{ display: 'flex', gap: '10px', zIndex: 10 }}>
                {tableCards.map((card, index) => (
                  <div key={index} className="playing-card" style={{ color: getSuitColor(card.suit), transform: 'scale(0.8)' }}>
                    <div className="card-top">{card.value}</div>
                    <div className="card-middle">{getSuitSymbol(card.suit)}</div>
                    <div className="card-bottom">{card.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* DYNAMIC SEATING */}
            {playersList.map((player, index) => {
              const totalPlayers = playersList.length;
              const angle = (index / totalPlayers) * 2 * Math.PI - (Math.PI / 2);
              const leftPos = 50 + 50 * Math.cos(angle);
              const topPos = 50 + 50 * Math.sin(angle);

              return (
                <div key={player.id} className="table-seat" style={{ left: `${leftPos}%`, top: `${topPos}%` }}>
                  <div className="seat-avatar"></div>
                  <div className="seat-name">{player.name}</div>
                </div>
              );
            })}
          </div>

          {/* Player's Hand Area (Bottom of the screen) */}
          {hand.length > 0 && (
            <div className="hand-container" style={{ marginTop: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
              {hand.map((card, index) => (
                <div 
                  key={index} 
                  className="playing-card" 
                  style={{ color: getSuitColor(card.suit) }}
                  onClick={() => playCard(card)}
                >
                  <div className="card-top">{card.value}</div>
                  <div className="card-middle">{getSuitSymbol(card.suit)}</div>
                  <div className="card-bottom">{card.value}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default App