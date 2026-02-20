import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

const socket = io('http://localhost:3001')

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected)
  const [view, setView] = useState('landing') 
  const [nickname, setNickname] = useState('')
  const [roomCode, setRoomCode] = useState('')
  
  const [playersList, setPlayersList] = useState([])
  const [hand, setHand] = useState([])
  const [tableCards, setTableCards] = useState([])
  const [currentTurnId, setCurrentTurnId] = useState('')

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('updatePlayers', setPlayersList)
    socket.on('receiveCards', setHand)
    socket.on('updateTable', setTableCards)
    socket.on('turnUpdate', setCurrentTurnId)
    socket.on('errorMsg', alert)

    return () => {
      socket.off('connect'); socket.off('disconnect'); socket.off('updatePlayers');
      socket.off('receiveCards'); socket.off('updateTable'); socket.off('turnUpdate'); socket.off('errorMsg');
    }
  }, [])

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

  // NEW: Action to pick a team
  const joinTeam = (teamName) => {
    socket.emit('joinTeam', { roomCode, team: teamName })
  }

  const startGame = () => socket.emit('startGame', roomCode)

  const playCard = (cardToPlay) => {
    if (currentTurnId !== socket.id) return alert("Wait for your turn!")
    setHand(hand.filter(c => !(c.suit === cardToPlay.suit && c.value === cardToPlay.value)))
    socket.emit('playCard', { roomCode, card: cardToPlay })
  }

  const getSuitColor = (suit) => (suit === 'Hearts' || suit === 'Diamonds' ? '#ef4444' : '#111827')
  const getSuitSymbol = (suit) => {
    switch(suit) { case 'Hearts': return '♥'; case 'Diamonds': return '♦'; case 'Clubs': return '♣'; case 'Spades': return '♠'; default: return ''; }
  }

  // NEW: Interleave players so Team A and Team B sit in alternating seats
  const getSeatedPlayers = () => {
    const teamA = playersList.filter(p => p.team === 'A');
    const teamB = playersList.filter(p => p.team === 'B');
    const unassigned = playersList.filter(p => !p.team);
    
    let interleaved = [];
    const maxLen = Math.max(teamA.length, teamB.length);
    for (let i = 0; i < maxLen; i++) {
      if (teamA[i]) interleaved.push(teamA[i]);
      if (teamB[i]) interleaved.push(teamB[i]);
    }
    return [...interleaved, ...unassigned];
  }

  const seatedPlayers = getSeatedPlayers();

  return (
    <div className="app-container">
      <div className="status-bar">
        <span>MENDICOT ONLINE</span>
        <span>{isConnected ? '🟢 Server Online' : '🔴 Server Offline'}</span>
      </div>

      {view === 'landing' && (
        <div className="landing-container">
          <div className="action-card">
            <h2>no download <strong>free online mendicot</strong> with your friends!</h2>
            <button className="btn-primary" onClick={() => setView('create')}>START A NEW GAME</button>
          </div>
          <div className="action-card">
            <h2>play with the community in <strong>Clubs, Games and Freerolls</strong></h2>
            <button className="btn-secondary" onClick={() => setView('join')}>FIND A GAME</button>
          </div>
        </div>
      )}

      {view === 'create' && (
        <div className="landing-container">
          <div className="action-card">
            <h3>N E W &nbsp; G A M E</h3>
            <input className="modern-input" placeholder="Your Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            <button className="btn-primary" onClick={handleCreateGame}>CREATE GAME</button>
          </div>
        </div>
      )}

      {view === 'join' && (
        <div className="landing-container">
          <div className="action-card">
            <h3>J O I N &nbsp; G A M E</h3>
            <input className="modern-input" placeholder="Your Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            <input className="modern-input" placeholder="Room Code" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} />
            <button className="btn-secondary" onClick={handleJoinGame}>JOIN GAME</button>
          </div>
        </div>
      )}

      {view === 'table' && (
        <div className="table-container" style={{ flexDirection: 'column' }}>
          
          <div className="poker-table">
            
            {hand.length === 0 && (
              <div className="waiting-modal">
                <h3>Room: {roomCode}</h3>
                
                {/* NEW: TEAM SELECTION UI */}
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', margin: '20px 0' }}>
                  <div style={{ padding: '15px', border: '2px solid #ef4444', borderRadius: '10px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#ef4444' }}>Team A</h4>
                    {playersList.filter(p => p.team === 'A').map(p => <div key={p.id}>{p.name}</div>)}
                    <button onClick={() => joinTeam('A')} style={{ marginTop: '10px', background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Join A</button>
                  </div>
                  
                  <div style={{ padding: '15px', border: '2px solid #3b82f6', borderRadius: '10px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#3b82f6' }}>Team B</h4>
                    {playersList.filter(p => p.team === 'B').map(p => <div key={p.id}>{p.name}</div>)}
                    <button onClick={() => joinTeam('B')} style={{ marginTop: '10px', background: '#3b82f6', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Join B</button>
                  </div>
                </div>

                <button className="btn-secondary" onClick={copyInviteLink} style={{ padding: '8px 16px', fontSize: '0.9rem', marginBottom: '15px' }}>
                  COPY LINK
                </button>
                <br/>
                <button className="btn-primary" onClick={startGame}>START GAME & DEAL</button>
              </div>
            )}

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

            {/* Render the mathematically seated players */}
            {seatedPlayers.map((player, index) => {
              const totalPlayers = seatedPlayers.length;
              const angle = (index / totalPlayers) * 2 * Math.PI - (Math.PI / 2);
              const leftPos = 50 + 50 * Math.cos(angle);
              const topPos = 50 + 50 * Math.sin(angle);

              // Set border color based on team, but highlight in gold if it's their turn!
              let avatarBorder = '#555';
              if (player.team === 'A') avatarBorder = '#ef4444'; // Red for Team A
              if (player.team === 'B') avatarBorder = '#3b82f6'; // Blue for Team B
              if (player.id === currentTurnId) avatarBorder = '#fbbf24'; // Gold if turn

              return (
                <div key={player.id} className="table-seat" style={{ left: `${leftPos}%`, top: `${topPos}%` }}>
                  <div 
                    className="seat-avatar"
                    style={{ 
                      borderColor: avatarBorder,
                      boxShadow: player.id === currentTurnId ? '0 0 15px #fbbf24' : '0 5px 15px rgba(0,0,0,0.5)',
                      transition: 'all 0.3s ease'
                    }}
                  ></div>
                  <div className="seat-name">{player.name}</div>
                </div>
              );
            })}
          </div>

          {hand.length > 0 && (
            <div className="hand-container" style={{ marginTop: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
              {hand.map((card, index) => (
                <div 
                  key={index} 
                  className="playing-card" 
                  style={{ 
                    color: getSuitColor(card.suit),
                    opacity: currentTurnId === socket.id ? 1 : 0.6,
                    cursor: currentTurnId === socket.id ? 'pointer' : 'not-allowed'
                  }}
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