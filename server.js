const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3005;

app.use(bodyParser.json());
app.use(cors());

// Cache to store game IDs and nicknames
const gameCache = {};

app.options('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).send();
});

app.post('/start', (req, res) => {
  const gameId = req.body.gameId;
  const nickName = req.body.nickName;
  
  // Add nickname to game ID in cache
  if (!gameCache[gameId]) {
    gameCache[gameId] = [];
  }
  gameCache[gameId].push(nickName);
  
  console.log(`Received nickName: ${nickName}`);
  console.log(`Received game ID: ${gameId}`);
  console.log(`Game cache: ${JSON.stringify(gameCache)}`);
  
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
    
    res.send({ message: 'Nickname added' });
  }
});

app.get('/hitreplyall/:gameId/:nickName', (req, res) => {
  const gameId = req.params.gameId;
  const nickName = req.params.nickName;
  console.log('NICKNAME: ', nickName);
  
  // Retrieve nicknames for game ID from cache
  let nickNames = gameCache[gameId] || [];

  // Add new nickname to nickNames array
  console.log(nickNames);

  console.log(`Retrieving nickNames for game ID ${gameId}`);
  console.log(`Nicknames: ${nickNames}`);

  // Update nicknames for game ID in cache
  
  res.send({ nickNames });
});


app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
