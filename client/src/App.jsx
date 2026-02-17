import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const socket = io('http://localhost:3001')

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected)
  const [socketId, setSocketId] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [inRoom, setInRoom] = useState(false)
  // NEW: State to hold our cards
  const [hand, setHand] = useState([]) 

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true)
      setSocketId(socket.id)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setSocketId('')
    })

    socket.on('playerJoined', (newPlayerId) => {
      console.log(`Someone joined! ID: ${newPlayerId}`);
    })

    // NEW: Listen for the cards dealt by the server
    socket.on('receiveCards', (cards) => {
      console.log('Got my cards!', cards)
      setHand(cards)
    })

    // NEW: Listen for errors (like trying to start with 1 player)
    socket.on('errorMsg', (msg) => {
      alert(msg)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('playerJoined')
      socket.off('receiveCards')
      socket.off('errorMsg')
    }
  }, [])

  const joinRoom = () => {
    if (roomCode !== '') {
      socket.emit('joinRoom', roomCode)
      setInRoom(true)
    }
  }

  // NEW: Tell the server to deal the cards
  const startGame = () => {
    socket.emit('startGame', roomCode)
  }

  // HELPER: Get the right color for the suit
  const getSuitColor = (suit) => {
    return suit === 'Hearts' || suit === 'Diamonds' ? '#ef4444' : '#111827';
  }
  
  // HELPER: Get the right symbol for the suit
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
      <h1>Mendicot Online</h1>
      
      <div className="status-box">
        <p>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
        <p>ID: <strong>{socketId || 'Waiting...'}</strong></p>
      </div>

      {!inRoom ? (
        <div className="lobby-box">
          <h3>Join a Game</h3>
          <input 
            type="text" 
            placeholder="Enter Room Code" 
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            style={{ padding: '10px', marginRight: '10px', borderRadius: '5px' }}
          />
          <button onClick={joinRoom}>Join Table</button>
        </div>
      ) : (
        <div className="table-box">
          <h2>Game Table: {roomCode}</h2>
          
          {/* If we have no cards, show the start button. If we do, show the cards! */}
          {hand.length === 0 ? (
            <div>
              <p>Waiting for players...</p>
              <button onClick={startGame} style={{ marginTop: '10px' }}>Start Game & Deal</button>
            </div>
          ) : (
            <div className="game-area">
              <h3>Your Hand</h3>
              <div className="hand-container">
                {hand.map((card, index) => (
                  <div 
                    key={index} 
                    className="playing-card" 
                    style={{ color: getSuitColor(card.suit) }}
                  >
                    <div className="card-top">{card.value}</div>
                    <div className="card-middle">{getSuitSymbol(card.suit)}</div>
                    <div className="card-bottom">{card.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App