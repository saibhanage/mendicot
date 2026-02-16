import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

// Connect to the server we just built
// We define this outside the component so it doesn't reconnect on every render
const socket = io('http://localhost:3001')

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected)
  const [socketId, setSocketId] = useState('')

  useEffect(() => {
    // When the connection opens
    socket.on('connect', () => {
      setIsConnected(true)
      setSocketId(socket.id)
    })

    // When the connection closes
    socket.on('disconnect', () => {
      setIsConnected(false)
      setSocketId('')
    })

    // Cleanup function when the component unmounts
    return () => {
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [])

  return (
    <div className="app-container">
      <h1>Mendicot Online</h1>
      
      <div className="status-box">
        <h2>Connection Status</h2>
        <p>
          Server: {isConnected ? (
            <span style={{ color: 'green', fontWeight: 'bold' }}>Connected 🟢</span>
          ) : (
            <span style={{ color: 'red', fontWeight: 'bold' }}>Disconnected 🔴</span>
          )}
        </p>
        <p>Your Player ID: <strong>{socketId || 'Waiting...'}</strong></p>
      </div>

      {isConnected && (
        <button onClick={() => alert('Room logic coming next!')}>
          Find a Game
        </button>
      )}
    </div>
  )
}

export default App