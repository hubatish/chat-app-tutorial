const enums = require('./roleDefinitions');
const PlayerCollection = require('./playerCollection');

class GameRoom {
  constructor() {
    this.playersInGame = new PlayerCollection();    
    this.room = 'default';
    this.isGameGoing = false;
    this.roundTimeout;
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
  setUpIo(socketServer) {
    this.io = socketServer;
    io.on('connection', function(client) {
      client.on('join', function(data) {
        const id = client.id;
        client.join(this.room);
        client.emit('clientJoin', {id});
      });
    });
  }
}

module.exports = {
  GameRoom: GameRoom
};