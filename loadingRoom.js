const enums = require('./static/roleDefinitions');
const PlayerCollection = require('./playerCollection');

class LoadingRoom {
  constructor(io, roomManager) {
    this.players = new PlayerCollection();
    this.room = 'loading-room-1';
    this.io = io;
    this.roomManager = roomManager;
  }
  onConnection(client) {
    const self = this;
    client.on('join', function(data) {
      const id = client.id;
      self.players.addUnitializedPlayer(id);
      client.join(self.room);
      client.emit('clientJoin', {id});
    });
    client.on('nameSet', function(data) {
      // TODO: Let self happen whenever. But for now only happens in loading room.
      // Handle data.phoneId from client and use in order to rejoin in process game.
      self.players.modifyPlayer(client.id, player => {
        player.name = data.name;
        player.nameSet = true;
        return player;
      });
      // Shove them out of self room.
      const success = self.roomManager.movePlayerOutOfLoading(self.players.getPlayer(client.id), client);
      if (success) {
        self.players.removePlayer(client.id);
      }
    });  
  }
}

module.exports = LoadingRoom;