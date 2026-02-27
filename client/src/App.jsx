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
  const [scores, setScores] = useState({ A: 0, B: 0 })
  const [trumpSuit, setTrumpSuit] = useState(null)
  const [roundMessage, setRoundMessage] = useState('')
  
  // NEW: Track the Host
  const [hostId, setHostId] = useState('')

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('updatePlayers', setPlayersList)
    socket.on('receiveCards', setHand)
    socket.on('updateTable', setTableCards)
    socket.on('turnUpdate', setCurrentTurnId)
    socket.on('scoreUpdate', setScores)
    socket.on('trumpUpdate', setTrumpSuit)
    socket.on('updateHost', setHostId) // Listen for the host!
    socket.on('errorMsg', alert)

    socket.on('roundOver', (msg) => {
      setRoundMessage(msg)
      setTimeout(() => setRoundMessage(''), 5000)
    })

    return () => {
      socket.off('connect'); socket.off('disconnect'); socket.off('updatePlayers');
      socket.off('receiveCards'); socket.off('updateTable'); socket.off('turnUpdate'); 
      socket.off('scoreUpdate'); socket.off('trumpUpdate'); socket.off('errorMsg'); 
      socket.off('roundOver'); socket.off('updateHost');
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

  const joinTeam = (teamName) => socket.emit('joinTeam', { roomCode, team: teamName })
  const startGame = () => socket.emit('startGame', roomCode)

  const playCard = (cardToPlay) => {
    if (currentTurnId !== socket.id) return alert("Wait for your turn!")
    
    if (tableCards.length > 0) {
      const leadSuit = tableCards[0].suit;
      const hasLeadSuit = hand.some(c => c.suit === leadSuit);
      if (hasLeadSuit && cardToPlay.suit !== leadSuit) {
        return alert(`You must play a ${leadSuit} because you have one!`);
      }
    }

    setHand(hand.filter(c => !(c.suit === cardToPlay.suit && c.value === cardToPlay.value)))
    socket.emit('playCard', { roomCode, card: cardToPlay })
  }

  const getSuitColor = (suit) => (suit === 'Hearts' || suit === 'Diamonds' ? '#ef4444' : '#111827')
  const getSuitSymbol = (suit) => {
    switch(suit) { case 'Hearts': return '♥'; case 'Diamonds': return '♦'; case 'Clubs': return '♣'; case 'Spades': return '♠'; default: return ''; }
  }

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
            
            {roundMessage && (
              <div style={{ position: 'absolute', zIndex: 50, background: '#fbbf24', color: '#000', padding: '20px 40px', borderRadius: '15px', fontSize: '2rem', fontWeight: 'bold', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', textAlign: 'center' }}>
                {roundMessage}
                <div style={{ fontSize: '1rem', marginTop: '10px', fontWeight: 'normal' }}>Dealing next hand...</div>
              </div>
            )}

            {hand.length > 0 && (
              <div style={{ position: 'absolute', top: '20px', display: 'flex', gap: '20px', background: 'rgba(0,0,0,0.6)', padding: '10px 20px', borderRadius: '15px', zIndex: 10 }}>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Team A (10s): {scores?.A || 0}</span>
                <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>Team B (10s): {scores?.B || 0}</span>
              </div>
            )}

            {hand.length > 0 && trumpSuit && (
              <div style={{ position: 'absolute', top: '70px', background: 'rgba(0,0,0,0.8)', padding: '5px 15px', borderRadius: '20px', border: `1px solid ${getSuitColor(trumpSuit)}`, zIndex: 10 }}>
                Trump: <span style={{ color: getSuitColor(trumpSuit), fontSize: '1.2rem' }}>{getSuitSymbol(trumpSuit)}</span>
              </div>
            )}
            
            {hand.length === 0 && !roundMessage && (
              <div className="waiting-modal">
                {/* NEW: Show a small crown icon next to the room code if you are the host */}
                <h3>Room: {roomCode} {hostId === socket.id && '👑'}</h3>
                
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', margin: '20px 0' }}>
                  <div style={{ padding: '15px', border: '2px solid #ef4444', borderRadius: '10px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#ef4444' }}>Team A</h4>
                    {playersList.filter(p => p.team === 'A').map(p => <div key={p.id}>{p.name} {p.id === hostId ? '👑' : ''}</div>)}
                    <button onClick={() => joinTeam('A')} style={{ marginTop: '10px', background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Join A</button>
                  </div>
                  <div style={{ padding: '15px', border: '2px solid #3b82f6', borderRadius: '10px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#3b82f6' }}>Team B</h4>
                    {playersList.filter(p => p.team === 'B').map(p => <div key={p.id}>{p.name} {p.id === hostId ? '👑' : ''}</div>)}
                    <button onClick={() => joinTeam('B')} style={{ marginTop: '10px', background: '#3b82f6', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Join B</button>
                  </div>
                </div>
                
                <button className="btn-secondary" onClick={copyInviteLink} style={{ padding: '8px 16px', fontSize: '0.9rem', marginBottom: '15px' }}>COPY LINK</button>
                <br/>
                
                {/* NEW: ONLY SHOW THE START BUTTON IF YOU ARE THE HOST */}
                {hostId === socket.id ? (
                  <button className="btn-primary" onClick={startGame}>START GAME & DEAL</button>
                ) : (
                  <p style={{ color: '#aaa', fontStyle: 'italic' }}>Waiting for the host to start the game...</p>
                )}
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

            {seatedPlayers.map((player, index) => {
              const totalPlayers = seatedPlayers.length;
              const angle = (index / totalPlayers) * 2 * Math.PI - (Math.PI / 2);
              const leftPos = 50 + 50 * Math.cos(angle);
              const topPos = 50 + 50 * Math.sin(angle);
              let avatarBorder = player.team === 'A' ? '#ef4444' : player.team === 'B' ? '#3b82f6' : '#555'; 
              if (player.id === currentTurnId) avatarBorder = '#fbbf24'; 

              return (
                <div key={player.id} className="table-seat" style={{ left: `${leftPos}%`, top: `${topPos}%` }}>
                  <div className="seat-avatar" style={{ borderColor: avatarBorder, boxShadow: player.id === currentTurnId ? '0 0 15px #fbbf24' : '0 5px 15px rgba(0,0,0,0.5)', transition: 'all 0.3s ease' }}></div>
                  {/* NEW: Add a little crown to the host's name on the table */}
                  <div className="seat-name">{player.id === hostId ? '👑 ' : ''}{player.name}</div>
                </div>
              );
            })}
          </div>

          {hand.length > 0 && (
            <div className="hand-container" style={{ marginTop: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
              {hand.map((card, index) => (
                <div key={index} className="playing-card" style={{ color: getSuitColor(card.suit), opacity: currentTurnId === socket.id ? 1 : 0.6, cursor: currentTurnId === socket.id ? 'pointer' : 'not-allowed' }} onClick={() => playCard(card)}>
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