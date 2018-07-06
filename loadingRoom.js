const enums = require('./static/roleDefinitions');
const PlayerCollection = require('./playerCollection');

class LoadingRoom {
  constructor(io, roomManager) {
    this.players = new PlayerCollection();
    this.roomName = 'loading-room-1';
    this.io = io;
    this.roomManager = roomManager;
  }
  onConnection(client) {
    const self = this;
    client.on('nameSet', function(data) {
      // TODO: Let self happen whenever. But for now only happens in loading room.
      self.players.modifyPlayer(client.id, player => {
        player.name = data.name;
        player.nameSet = true;
        return player;
      });
      // Shove them out of self room.
      const success = self.roomManager.movePlayerOutOfLoading(client, self.players.getPlayer(client.id));
      if (success) {
        self.players.removePlayer(client.id);
      }
    });  
  }
  addPlayer(client, player) {
    this.players.addPlayer(player);
  }
  addUnitializedPlayer(client, phoneId) {
    this.players.addUnitializedPlayer(client.id, phoneId);
    client.emit('clientJoin', {id: client.id});
    return true;
  }
}

module.exports = LoadingRoom;