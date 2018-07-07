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
    this.roomName = 'default';
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
    this.broadcastNamesInGame();
  }
  broadcastNamesInGame() {
    this.io.in(this.roomName).emit('allPlayersNames', this.playersInGame.getPlayerNames());
  }
  addUnitializedPlayer(client, phoneId) {
    // Setup server state.
    const findPlayerByPhoneId = function(player) {
      return player.phoneId = phoneId;
    };
    if (this.gameState == GameRoomState.Lobby) {
      let lobbyPlayer = this.playersInLobby.findPlayerMatching(findPlayerByPhoneId);
      if (lobbyPlayer.phoneId) {
        client.emit('gameStatus', {
          gameState: this.gameState,
        });
        return true;
      }
      return false;
    }
    let foundPlayer = this.playersInGame.findPlayerMatching(findPlayerByPhoneId);
    if (!foundPlayer.phoneId) {
      return false;
    }
    this.playersInGame.modifyPlayerId(foundPlayer.id, client.id);
    if (this.gameState == GameRoomState.InProgress) {
      if (foundPlayer.gameStartMessage) {
        client.emit('startGame', foundPlayer.gameStartMessage);
      } else {
        // error!
        console.log('go to lobby probably');
      }
    }
    if (this.gameState == GameRoomState.Done) {
      if (foundPlayer.gameDoneMessage) {
        client.emit('gameDone', foundPlayer.gameDoneMessage);
      } else {
        console.log('no game done message, go to lobby');
      }
    }
    return true;
  }
  addPlayer(client, player) {
    if (this.gameState == GameRoomState.InProgress) {
      this.playersInLobby.addPlayer(player);
    } else {
      this.playersInGame.addPlayer(player);
      this.broadcastNamesInGame();
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
      const gameDoneMessage = {
        won,
        killedPlayers: maxNames,
      };
      this.io.to(id).emit('gameDone', gameDoneMessage);
      // setup player for next round & rejoins.
      player.voteFor = false;
      player.gameDoneMessage = gameDoneMessage;
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
      const roundTime = 120;
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
        player.gameStartMessage = clientData; // store info for reconnect.
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