// app.js
var express = require('express');
var http = require('http');
var socketIo = require('socket.io');

var app = express();
var server = http.createServer(app);  
var io = socketIo(server);

app.use(express.static(__dirname + '/node_modules'));
app.get('/', function(req, res,next) {
  res.sendFile(__dirname + '/index.html');
});

// App logic.
const Role = {
  Werewolf: 'Werewolf',
  Villager: 'Villager',
  Seer: 'Seer',
};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

let playersForIds = new Map();
function getPlayerNames() {
  const names = [];
  for (const [id, player] of playersForIds) {
    let name = player.name;
    names.push(name);
  }
  return names;
}

function getWerewolfNames() {
  const names = [];
  for (const [id, player] of playersForIds) {
    if (player.role == Role.Werewolf) {
      let name = player.name;
      names.push(name);  
    }
  }
  return names;  
}

function assignRoles() {
  let maxWerewolves = playersForIds.size < 4 ? 1 : 2;
  let numWerewolves = 0;
  const extraCards = 3;
  for (const [id, player] of playersForIds) {
    if (numWerewolves < maxWerewolves &&
        getRandomInt(0, playersForIds.size + extraCards) < 2) {
      playersForIds.get(id).role = Role.Werewolf; 
      numWerewolves += 1;       
    } else {
      if (getRandomInt(0, playersForIds.size + extraCards) < 2) {
        playersForIds.get(id).role = Role.Seer;
      } else {
        playersForIds.get(id).role = Role.Villager;
      }
    }
  }
}

let room = 'default';

io.on('connection', function(client) {
  client.on('join', function(data) {
    const id = client.id;
    playersForIds.set(id, {
      name: 'load' + client.id.substr(0, 5),
    });
    client.join(room);
    client.emit('clientJoin', {id});
    io.in(room).emit('allPlayersNames', getPlayerNames());
  });

  client.on('nameSet', function(data) {
    playersForIds.get(client.id).name = data.name;
    io.in(room).emit('allPlayersNames', getPlayerNames());
  });

  client.on('startGame', (data) => {
    assignRoles();
    for (const [id, player] of playersForIds) {
      console.log('attempting to send' + id + ' to '+player.role);
      // Send any extra info with data.
      const clientData = {
        role: player.role
      };
      switch(player.role) {
        case Role.Werewolf:
          clientData.werewolves = getWerewolfNames();
          break;
        default:
          break; 
      }
      io.to(id).emit('startGame', clientData);
    }
  });

  function findPlayerByName(name) {
    for (const [id, player] of playersForIds) {
      if (name == player.name) {
        return player;
      }
    }
    return {};
  }
  client.on('viewRole', (data) => {
    const player = findPlayerByName(data.name);
    if (!player.role) {
      console.log('no player found with name '+data.name);
    }
    client.emit('tellRole', player);
  });

  client.on('disconnect', (reason) => {
    playersForIds.delete(client.id);
  });
});

console.log('1.calling for server to start listening from port 4200');
server.listen(4200);
