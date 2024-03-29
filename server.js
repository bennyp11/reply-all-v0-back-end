const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
var Mutex = require('async-mutex').Mutex;

const app = express();
const port = 3005;

app.use(bodyParser.json());
app.use(cors());

// Cache to store game IDs and nicknames
const gameCache = {};

const wss = new WebSocket.Server({ port: 8082 });

app.options('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).send();
});

app.post('/start', (req, res) => {
  const gameId = req.body.gameId;
  const nickName = req.body.nickName;
  const cards = JSON.parse(fs.readFileSync('./cards.json', 'utf8'));

  const replyAllCards = [];
  const inboxCards = [];

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  for (const card of cards) {
    if (card.CardType === "ReplyAll") {
      replyAllCards.push(card);
    } else if (card.CardType === "Inbox") {
      inboxCards.push(card);
    }
  }

  if (!gameCache[gameId]) {
    gameCache[gameId] = { nickNames: [], replyAllCards: [], inboxCards: [] };
  }

  const hand = replyAllCards.splice(0, 7);
  const newPlayer = { nickName, hand };
  gameCache[gameId].nickNames.push(newPlayer);
  gameCache[gameId].replyAllCards = replyAllCards;
  gameCache[gameId].inboxCards = inboxCards;

  res.send({ message: 'Game ID received' });
});



app.post('/join', (req, res) => {
  const gameId = req.body.gameId;
  const nickName = req.body.nickName;
  const hand = gameCache[gameId].replyAllCards.splice(0, 7);
  const newPlayer = { nickName, hand };
  gameCache[gameId].nickNames.push(newPlayer);

  
  // Check if game ID exists in cache
  if (!gameCache[gameId]) {
    console.log(`Invalid game code: ${gameId}`);
    res.status(400).send({ message: 'Invalid game code' });
  } else {
    // Add nickname to game ID in cache
    
    console.log(`Received nickName: ${nickName}`);
    console.log(`Received game ID: ${gameId}`);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const nickNames = gameCache[gameId].nickNames || [];
        client.send(JSON.stringify({ nickNames }));
      }
    });
    
    res.send({ message: 'Nickname added' });
  }
});

app.get('/hitreplyall/:gameId/:nickName/initaldeal', (req, res) => {
  const gameId = req.params.gameId;
  const nickName = req.params.nickName;

  const mutex = new Mutex();
  mutex.acquire().then((release) => {
    try {
      // Check if game ID exists in cache
      if (!gameCache[gameId]) {
        res.status(404).send({ message: 'Game ID not found' });
        release();
        return;
      }

      // Retrieve nicknames for game ID from cache
      let nickNames = gameCache[gameId].nickNames || [];
      console.log(nickNames);

      const player = nickNames.find((player) => player.nickName === nickName);
      if (!player) {
        res.status(404).send({ message: 'Player not found' });
        release();
        return;
      }

      res.send({ nickNames, cardsToSend: player.hand });

      release();
    } catch (error) {
      console.error(error);

      release();
      res.status(500).send({ message: 'Internal server error' });
    }
  });
});


app.post('/beginmatch', (req, res) => {
  const gameId = req.body.gameId;

  // Check if game ID exists in cache
  if (!gameCache[gameId]) {
    console.log(`Invalid game code: ${gameId}`);
    res.status(400).send({ message: 'Invalid game code' });
    return;
  }

  const nickNames = gameCache[gameId].nickNames || [];

  if (nickNames.length < 3) {
    res.status(400).send({ message: 'Not enough players in the game' });
    return;
  }

  const inboxCards = gameCache[gameId].inboxCards || [];

  if (inboxCards.length < 1) {
    res.status(400).send({ message: 'No more inbox cards' });
    return;
  }

  const inboxCard = inboxCards.splice(0, 1)[0];
  const firstPlayer = nickNames[0];

  firstPlayer.hand.push(inboxCard);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const nickNames = gameCache[gameId].nickNames || [];
      client.send(JSON.stringify({ nickNames }));
    }
  });

  res.send({ message: 'Inbox card dealt to first player' });
});

app.post('/replyallcardplayed', (req, res) => {
  const { gameId, nickName, cardIndex } = req.body;

  if (!gameCache[gameId]) {
    res.status(400).send({ message: 'Invalid game code' });
    return;
  }

  const player = gameCache[gameId].nickNames.find(player => player.nickName === nickName);
  if (!player) {
    res.status(404).send({ message: 'Player not found' });
    return;
  }

  const playedCard = player.hand.splice(cardIndex, 1)[0];

  res.send({ message: 'ReplyAll card played', playedCard });
});

app.post('/replyallcardselected', (req, res) => {
  const { gameId, selectedCardIndex } = req.body;

  if (!gameCache[gameId]) {
    res.status(400).send({ message: 'Invalid game code' });
    return;
  }

  const replyAllCards = gameCache[gameId].replyAllCards;

  if (selectedCardIndex < 0 || selectedCardIndex >= replyAllCards.length) {
    res.status(400).send({ message: 'Invalid card index' });
    return;
  }

  const selectedCard = replyAllCards[selectedCardIndex];

  res.send({ message: 'ReplyAll card selected', selectedCard });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
