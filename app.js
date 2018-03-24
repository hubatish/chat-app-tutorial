// app.js
'use strict';
var express = require('express');
var http = require('http');
var socketIo = require('socket.io');

var app = express();
var server = http.createServer(app);  
var io = socketIo(server);

app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname + '/static'));
app.get('/', function(req, res,next) {
  res.sendFile(__dirname + '/index.html');
});

// App logic.
const Role = {
  Werewolf: 'Werewolf',
  Villager: 'Villager',
  Seer: 'Seer',
  Riddler: 'Riddler'
};

const Team = {
  Villagers: 'Villagers',
  Werewolves: 'Werewolves'
};

const teamForRole = new Map();
teamForRole.set(Role.Werewolf, Team.Werewolves);
teamForRole.set(Role.Villager, Team.Villagers);
teamForRole.set(Role.Seer, Team.Villagers);
teamForRole.set(Role.Riddler, Team.Villagers);

let playersForIds = new Map();
let room = 'default';
let roundTimeout;

//The maximum is exclusive and the minimum is inclusive
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function getPlayerNames() {
  const names = [];
  // So sad can't use [id, player] of..
  // Cause only node 5.6 on windows.
  // Instead get back array [id, player].
  for (const entry of playersForIds) {
    names.push(entry[1].name);
  }
  return names;
}

function getWerewolfNames() {
  const names = [];
  for (const entry of playersForIds) {
    const player = entry[1];
    if (player.role == Role.Werewolf) {
      names.push(player.name);  
    }
  }
  return names;
}

function assignRoles() {
  const roleSet = [];
  let maxWerewolves = playersForIds.size < 4 ? 1 : 2;
  for (let i=0; i<= maxWerewolves; i++) {
    roleSet.push(Role.Werewolf);
  }
  // Add singleton roles.
  roleSet.push(Role.Seer);
  const extraCards = playersForIds.size < 4 ? 1 : 3;
  for (let i = roleSet.length; i < playersForIds.size + extraCards; i++) {
    // Add roles with multiple people.
    if (getRandomInt(0, 3) == 0) {
      roleSet.push(Role.Villager);      
    } else {
      roleSet.push(Role.Riddler);
    }
  }
  for (const entry of playersForIds) {
    const id = entry[0];
    const player = entry[1];
    const r = getRandomInt(0, roleSet.length);
    playersForIds.get(id).role = roleSet[r];
    roleSet.splice(r, 1);
  }
}

function findPlayerByName(name) {
  for (const entry of playersForIds) {
    const id = entry[0];
    const player = entry[1];
    if (name == player.name) {
      return player;
    }
  }
  return {};
}

function countPlayersByRole(role) {
  let numRole = 0;
  for (const entry of playersForIds) {
    const id = entry[0];
    const player = entry[1];
    if (role == player.role) {
      numRole += 1;
    }
  }
  return numRole;
}

function getRandomPlayerExceptIds(ids) {
  const playerIds = Array.from(playersForIds.keys());
  for (const id of ids) {
    playerIds.splice(playerIds.indexOf(id), 1);    
  }
  if (playerIds.length == 0) {
    return {};
  }
  const r = getRandomInt(0, playerIds.length);
  return playersForIds.get(playerIds[r]);
}

function getRandomPlayerExcept(id) {
  return getRandomPlayerExceptIds([id]);
}

function generateRiddle(id) {
  const player1 = getRandomPlayerExcept(id);
  if (!player1.role) {
    return 'What happens to a story if no one is there to hear it?';
  }
  const player2 = getRandomPlayerExceptIds([id, player1.id]);
  if (!player2.role) {
    return "Don't trust anyone.";
  }
  const sameTeam =
      teamForRole[player1.role] == teamForRole[player2.role] ?
      'same' : 'opposite';
  return player1.name + ' is on the ' + sameTeam + ' team as ' +
      player2.name;
}

io.on('connection', function(client) {
  client.on('join', function(data) {
    const id = client.id;
    playersForIds.set(id, {
      name: 'load' + client.id.substr(0, 5),
      id,
    });
    client.join(room);
    client.emit('clientJoin', {id});
    io.in(room).emit('allPlayersNames', getPlayerNames());
  });

  client.on('nameSet', function(data) {
    playersForIds.get(client.id).name = data.name;
    io.in(room).emit('allPlayersNames', getPlayerNames());
  });

  client.on('viewRole', (data) => {
    const player = findPlayerByName(data.name);
    if (!player.role) {
      console.log('no player found with name '+data.name);
    }
    client.emit('tellRole', player);
  });

  client.on('voteFor', (data) => {
    playersForIds.get(client.id).voteFor = data.name;
  });

  client.on('startGame', (data) => {
    assignRoles();
    const numVillagers = countPlayersByRole(Role.Villager);
    const werewolves = getWerewolfNames();
    for (const entry of playersForIds) {
      const id = entry[0];
      const player = entry[1];
      // Clear player in-game variables.
      playersForIds.get(id).voteFor = '';
      console.log('attempting to send' + player.role + ' to '+ id);
      // Send any extra info with data.
      const clientData = {
        role: player.role
      };
      switch(player.role) {
        case Role.Villager:
          clientData.numVillagers = numVillagers;
          break;
        case Role.Werewolf:
          clientData.werewolves = werewolves;
          break;
        case Role.Seer:
          let viewedPlayer = getRandomPlayerExcept(id);
          if (!viewedPlayer.role) {
            // Just give self if only player.
            viewedPlayer = player;
          }
          clientData.viewedPlayer = viewedPlayer;
          break;
        case Role.Riddler:
          clientData.riddle = generateRiddle(id);
          break;
        default:
          break; 
      }
      io.to(id).emit('startGame', clientData);
    }
    roundTimeout = setTimeout(timesUp, 1000 * 30);
  });

  client.on('endRound', (data) => {
    timesUp();
    clearTimeout(roundTimeout);
  });

  function timesUp() {
    // Calculate who has most votes.
    const voteTallies = new Map();
    for (const entry of playersForIds) {
      const id = entry[0];
      const player = entry[1];
      if (player.voteFor) {
        if (!voteTallies.has(player.voteFor)) {
          voteTallies.set(player.voteFor, 0);
        }
        voteTallies.set(player.voteFor, voteTallies.get(player.voteFor) + 1);
      }
    }
    let maxNames = [];
    let maxVotes = 0;
    for (const entry of voteTallies) {
      const name = entry[0];
      const numVotes = entry[1];
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
        for (const entry of playersForIds) {
          const id = entry[0];
          const player = entry[1];
          if (player.role == Role.Werewolf) {
            villagersWon = false;
          }
        }
      }
    }
    // inform players of result
    for (const entry of playersForIds) {
      const id = entry[0];
      const player = entry[1];
      const won = player.role == Role.Werewolf ?
          !werewolfKilled :
          villagersWon;
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
