const enums = require('./roleDefinitions');
const PlayerCollection = require('./playerCollection');
const Role = enums.Role;
const Team = enums.Team;
const teamForRole = enums.teamForRole;

class GameRoom {
  constructor(io) {
    this.playersInGame = new PlayerCollection();    
    this.room = 'default';
    this.isGameGoing = false;
    this.roundTimeout = 0;
    this.io = io;
  }
  setGameGoing(isGoing) {
    this.isGameGoing = isGoing;
    // Set active status of all players for rest of round.
    this.playersInGame.forEach((id, player) => {
      player.activeInGame = isGoing;
      return player;
    });
    this.io.in(this.room).emit('allPlayersNames', this.playersInGame.getPlayerNames());
  }
  addPlayer(player, client) {
    if (this.isGameGoing) {
      return false;
    }
    this.io.in(this.room).emit('allPlayersNames', this.playersInGame.getPlayerNames());
    // Don't let them go to start round screen.
    client.emit('gameStatus', {
      isGameGoing: this.isGameGoing,
    });
  }
  onConnection(client) {
    const self = this;
    client.on('viewRole', (data) => {
      const player = self.playersInGame.findPlayerByName(data.name);
      if (!player.role) {
        console.log('no player found with name '+data.name);
      }
      client.emit('tellRole', player);
    });
    client.on('voteFor', (data) => {
      self.playersInGame.modifyPlayer(client.id, player => {
        player.voteFor = data.name;
        return player;
      })
    });
    client.on('startGame', (data) => {
      self.setGameGoing(true);
      self.playersInGame.assignRoles();
      const numVillagers = self.playersInGame.countPlayersByRole(Role.Villager);
      const werewolves = self.playersInGame.getWerewolfNames();
      self.playersInGame.forEach((id, player) => {
        // Clear player in-game variables.
        player.voteFor = '';
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
        return player;
      });
      self.roundTimeout = setTimeout(timesUp, 1000 * 30);
    });
  
    client.on('endRound', (data) => {
      self.timesUp();
      self.clearTimeout(this.roundTimeout);
    });
  
    function timesUp() {
      // Calculate who has most votes.
      const voteTallies = new Map();
      self.playersInGame.forEach((id, player) => {
        const id = player.id;  
        if (player.voteFor) {
          if (!voteTallies.has(player.voteFor)) {
            voteTallies.set(player.voteFor, 0);
          }
          voteTallies.set(player.voteFor, voteTallies.get(player.voteFor) + 1);
        }
      });
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
        const player = self.playersInGame.findPlayerByName(name);
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
          self.playersInGame.forEach((id, player) => {
            const id = player.id;      
            if (player.role == Role.Werewolf) {
              villagersWon = false;
            }
          });
        }
      }
      // inform players of result
      self.playersInGame.forEach((id, player) => {
        const won = player.role == Role.Werewolf ?
            !werewolfKilled :
            villagersWon;
        io.to(id).emit('gameDone', {
          won,
          killedPlayers: maxNames,
        });
      });
      self.setGameGoing(false);
    }  
  }
}

module.exports = GameRoom;