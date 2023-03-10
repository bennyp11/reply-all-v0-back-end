const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');

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

  // Add nickname to game ID in cache
  if (!gameCache[gameId]) {
    gameCache[gameId] = { nickNames: [], replyAllCards: [], inboxCards: [] };
  }

  gameCache[gameId].nickNames.push(nickName);
  gameCache[gameId].replyAllCards = replyAllCards;
  gameCache[gameId].inboxCards = inboxCards;

  console.log(gameCache[gameId].inboxCards);

  res.send({ message: 'Game ID received' });
});



app.post('/join', (req, res) => {
  const gameId = req.body.gameId;
  const nickName = req.body.nickName;
  
  // Check if game ID exists in cache
  if (!gameCache[gameId]) {
    console.log(`Invalid game code: ${gameId}`);
    res.status(400).send({ message: 'Invalid game code' });
  } else {
    // Add nickname to game ID in cache
    gameCache[gameId].push(nickName);
    
    console.log(`Received nickName: ${nickName}`);
    console.log(`Received game ID: ${gameId}`);
    console.log(`Game cache: ${JSON.stringify(gameCache)}`);

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
  console.log('NICKNAME: ', nickName);
  
  // Retrieve nicknames for game ID from cache
  let nickNames = gameCache[gameId].nickNames || [];
  //console.log('initialDeal ROUTE: ',gameCache[gameId]);

  // Add new nickname to nickNames array
  console.log(nickNames);

  console.log(`Retrieving nickNames for game ID ${gameId}`);
  console.log(`Nicknames: ${nickNames}`);


  
  res.send({ nickNames });
});

/*app.get('/hitreply/:gameId/:nickName/initaldeal', (req, res) => {
  console.log('inital deal hit');
  const gameId = req.params.gameId;
  const nickName = req.params.nickName;

  // Read the JSON array of cards from cards.json
  const cards = JSON.parse(fs.readFileSync('./cards.json', 'utf8'));

  const replyAllCards = cards.filter(card => card.CardType === "ReplyAll");
  const inboxCards = cards.filter(card => card.CardType === "Inbox");

  // Fisher-Yates shuffle algorithm
  for (let i = replyAllCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [replyAllCards[i], replyAllCards[j]] = [replyAllCards[j], replyAllCards[i]];
  }

  const dealtCards = replyAllCards.slice(0, 7); // select the first 7 cards of the shuffled array
  
  res.send({ dealtCards });
});*/


app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
