const enums = require('./roleDefinitions');
const PlayerCollection = require('./playerCollection');

class LoadingRoom {
  constructor(io, roomManager) {
    this.players = new PlayerCollection();
    this.room = 'loading-room-1';
    this.io = io;
    this.roomManager = roomManager;
  }
  onConnection(client) {
    client.on('join', function(data) {
      const id = client.id;
      this.players.addUnitializedPlayer(id);
      client.join(this.room);
      client.emit('clientJoin', {id});
    });
    client.on('nameSet', function(data) {
      // TODO: Let this happen whenever. But for now only happens in loading room.
      this.players.modifyPlayer(client.id, player => {
        player.name = data.name;
        player.nameSet = true;
        return player;
      });
      // Shove them out of this room.
      this.roomManager.movePlayerOutOfLoading(this.players.removePlayer(client.id), client);
    });  
  }
}

module.exports = {
  LoadingRoom: LoadingRoom
}