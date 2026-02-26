// server/gameLogic.js

const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// 1. Generate a deck dynamically based on the number of players
function createDeck(playerCount) {
  let deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push({ suit, value });
    }
  }

  // Adjust the deck size based on Mendicot rules
  if (playerCount === 6 || playerCount === 8 || playerCount === 12) {
    deck = deck.filter(card => card.value !== '2'); // 48 Cards
  } else if (playerCount === 10) {
    deck = deck.filter(card => !(card.value === '2' && (card.suit === 'Clubs' || card.suit === 'Diamonds'))); // 50 Cards
  }

  return deck;
}

// 2. Shuffle the deck randomly
function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]; 
  }
  return deck;
}

// 3. Deal cards evenly to players
function dealCards(playerIds) {
  const playerCount = playerIds.length;
  let deck = shuffleDeck(createDeck(playerCount));
  let hands = {};

  playerIds.forEach(id => { hands[id] = []; });

  let currentPlayer = 0;
  while (deck.length > 0 && currentPlayer < playerIds.length) {
    hands[playerIds[currentPlayer]].push(deck.pop());
    currentPlayer = (currentPlayer + 1) % playerIds.length;
  }

  return hands; 
}

// --- NEW MATH ---

// 4. Convert card letters to real numbers for math (Ace is highest)
function getCardValue(value) {
  if (value === 'A') return 14;
  if (value === 'K') return 13;
  if (value === 'Q') return 12;
  if (value === 'J') return 11;
  return parseInt(value); 
}

// 5. Evaluate the trick and find the winner (NOW WITH TRUMP LOGIC)
function evaluateTrick(tableCards, trumpSuit) {
  // The first card played sets the lead suit
  const leadSuit = tableCards[0].suit;
  let winningCard = tableCards[0];
  let highestValue = getCardValue(tableCards[0].value);
  
  // Did the first person happen to lead with a Trump?
  let trumpPlayed = tableCards[0].suit === trumpSuit; 

  // Loop through the rest of the cards on the table
  for (let i = 1; i < tableCards.length; i++) {
    const card = tableCards[i];
    const val = getCardValue(card.value);

    if (trumpPlayed) {
      // If a Trump is currently winning, ONLY a higher Trump can beat it
      if (card.suit === trumpSuit && val > highestValue) {
        highestValue = val;
        winningCard = card;
      }
    } else {
      // No Trump has won yet...
      if (card.suit === trumpSuit) {
        // BAM! Someone just threw a Trump (Cut Hukum). It instantly becomes the winning card.
        trumpPlayed = true;
        highestValue = val;
        winningCard = card;
      } else if (card.suit === leadSuit && val > highestValue) {
        // Just following the normal lead suit with a higher card
        highestValue = val;
        winningCard = card;
      }
    }
  }
  
  // Return the socket ID of whoever threw the winning card
  return winningCard.playerId; 
}

module.exports = { createDeck, shuffleDeck, dealCards, evaluateTrick };