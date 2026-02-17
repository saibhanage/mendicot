// server/gameLogic.js

const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// 1. Generate a fresh 52-card deck
function createDeck() {
  let deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

// 2. Shuffle the deck randomly
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap elements
  }
  return deck;
}

// 3. Deal cards to players
function dealCards(playerIds) {
  let deck = shuffleDeck(createDeck());
  let hands = {};

  // Give each player an empty array to start
  playerIds.forEach(id => {
    hands[id] = [];
  });

  // Deal 13 cards to up to 4 players
  let currentPlayer = 0;
  while (deck.length > 0 && currentPlayer < playerIds.length) {
    hands[playerIds[currentPlayer]].push(deck.pop());
    currentPlayer = (currentPlayer + 1) % playerIds.length;
  }

  return hands; // Returns an object with player IDs as keys and their 13 cards as values
}

module.exports = { createDeck, shuffleDeck, dealCards };