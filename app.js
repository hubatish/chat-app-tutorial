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
    setTimeout(timesUp, 1000 * 30);
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

  client.on('voteFor', (data) => {
    console.log('voteFor!' + data.name);
    playersForIds.get(client.id).voteFor = data.name;
  });

  function timesUp() {
    // Calculate who has most votes.
    const voteTallies = new Map();
    console.log('players map next!');
    console.log(playersForIds);
    for (const [id, player] of playersForIds) {
      if (player.voteFor) {
        console.log('votefor is a thing!');
        if (!voteTallies.has(player.voteFor)) {
          voteTallies.set(player.voteFor, 0);
        }
        voteTallies.set(player.voteFor, voteTallies.get(player.voteFor) + 1);
      }
    }
    let maxNames = [];
    let maxVotes = 0;
    console.log('vote tallies next: ');
    console.log(voteTallies);
    for (const [name, numVotes] of voteTallies) {
      if (numVotes > maxVotes) {
        maxNames = [name];
        maxVotes = numVotes;
      } else if (numVotes == maxVotes && numVotes > 0) {
        maxNames.push(name);
      }
    }
    console.log('times up! ' + JSON.stringify(maxNames));
    // Was a werewolf killed?
    let werewolfKilled = false;
    let villagersWon = true;
    for (const name of maxNames) {
      const player = findPlayerByName(name);
      if (player.role == Role.Werewolf) {
        werewolfKilled = true;
        villagersWon = true;
      }
    }
    if (!werewolfKilled) {
      if (maxVotes > 0) {
        // Someone was killed despite no werewolves killed.
        villagersWon = false;
      } else {
        // check if there were any werewolves
        for (const [id, player] of playersForIds) {
          if (player.role == Role.Werewolf) {
            villagersWon = false;
          }
        }
      }
    }
    // inform players of result
    for (const [id, player] of playersForIds) {
      const won = player.role == Role.Werewolf ?
          !werewolfKilled :
          villagersWon;
      console.log('broadcasting to id: ' + id);
      io.in(room).to(id).emit('gameDone', {
        won,
        killedPlayers: maxNames,
      });
    }
  }

  client.on('disconnect', (reason) => {
    playersForIds.delete(client.id);
  });
});

console.log('1.calling for server to start listening from port 4200');
server.listen(4200);
