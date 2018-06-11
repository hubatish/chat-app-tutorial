const enums = require('./static/roleDefinitions');
const PlayerCollection = require('./playerCollection');
const Role = enums.Role;
const Team = enums.Team;
const teamForRole = enums.teamForRole;
const GameRoomState = enums.GameRoomState;

class GameRoom {
  constructor(io) {
    // Players who are in the active game.
    this.playersInGame = new PlayerCollection();
    // Players who joined game room while game is in progress.
    this.playersInLobby = new PlayerCollection();
    this.room = 'default';
    this.gameState = GameRoomState.Lobby;
    this.roundTimeout = 0;
    this.io = io;
  }
  setGameState(gameState) {
    this.gameState = gameState;
    // Set active status of all players for rest of round.
    this.playersInLobby.transferAllPlayersToOther(this.playersInGame);
    this.playersInGame.forEach((id, player) => {
      player.activeInGame = gameState;
      return player;
    });
    this.io.in(this.room).emit('allPlayersNames', this.playersInGame.getPlayerNames());
  }
  addPlayer(player, client) {
    if (this.gameState == GameRoomState.InProgress) {
      this.playersInLobby.addPlayer(player);
    } else {
      this.playersInGame.addPlayer(player);
      this.io.in(this.room).emit('allPlayersNames', this.playersInGame.getPlayerNames());  
    }
    client.emit('gameStatus', {
      gameState: this.gameState,
    });
  }
  timesUp() {
    // Calculate who has most votes.
    const voteTallies = new Map();
    this.playersInGame.forEach((id, player) => {
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
    // Was a werewolf killed?
    let werewolfKilled = false;
    let villagersWon = true;
    for (const name of maxNames) {
      const player = this.playersInGame.findPlayerByName(name);
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
        this.playersInGame.forEach((id, player) => {
          if (player.role == Role.Werewolf) {
            villagersWon = false;
          }
        });
      }
    }
    // inform players of result
    this.playersInGame.forEach((id, player) => {
      const won = player.role == Role.Werewolf ?
          !werewolfKilled :
          villagersWon;
      this.io.to(id).emit('gameDone', {
        won,
        killedPlayers: maxNames,
      });
      // clear voteFor.
      player.voteFor = false;
      return player;
    });
    this.setGameState(GameRoomState.Done);
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
      self.setGameState(GameRoomState.InProgress);
      self.playersInGame.assignRoles();
      const numVillagers = self.playersInGame.countPlayersByRole(Role.Villager);
      const werewolves = self.playersInGame.getWerewolfNames();
      const roundTime = 30;
      self.playersInGame.forEach((id, player) => {
        // Clear player in-game variables.
        player.voteFor = '';
        // Send any extra info with data.
        const clientData = {
          role: player.role,
          roundTime: roundTime,
        };
        switch(player.role) {
          case Role.Villager:
            clientData.numVillagers = numVillagers;
            break;
          case Role.Werewolf:
            clientData.werewolves = werewolves;
            break;
          case Role.Seer:
            let viewedPlayer = self.playersInGame.getRandomPlayerExceptId(id);
            if (!viewedPlayer.role) {
              // Just give self if only player.
              viewedPlayer = player;
            }
            clientData.viewedPlayer = viewedPlayer;
            break;
          case Role.Riddler:
            clientData.riddle = self.playersInGame.generateRiddle(id);
            break;
          default:
            break; 
        }
        self.io.to(id).emit('startGame', clientData);
        return player;
      });
      // closure preserves this!!! and/or scope.
      self.roundTimeout = setTimeout(() => self.timesUp(), 1000 * roundTime);
    });
  
    client.on('endRound', (data) => {
      self.timesUp();
      clearTimeout(self.roundTimeout);
    });
  }
}

module.exports = GameRoom;