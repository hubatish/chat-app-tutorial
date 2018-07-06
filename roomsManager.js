const GameRoom = require('./gameRoom');
const LoadingRoom = require('./loadingRoom');

//Safer but longer than any of these
//http://stackoverflow.com/questions/8107856/how-to-determine-a-users-ip-address-in-node
var getExternalIP = function(req) {
  return req.headers['x-forwarded-for'] || 
   req.connection.remoteAddress || 
   req.socket.remoteAddress ||
   req.connection.socket.remoteAddress;
};

// TODO: Actually add multiple rooms!

class RoomsManager {
  constructor(io) {
    // Player id -> room name.
    this.roomNamesForId = new Map();
    // Room name -> actual room object.
    this.roomsForName = new Map();
    this.startLoadingRoom = new LoadingRoom(io, this);
    this.roomsForName.set(this.startLoadingRoom.room, this.startLoadingRoom);
    // TODO: Make multiple at some point.
    this.defaultGameRoom = new GameRoom(io);
    this.roomsForName.set(this.defaultGameRoom.room, this.defaultGameRoom);

    io.on('connection', (client) => {this.onConnection(client); });
  }

  /** Try to move a player into a game room. Returns fail or not. */
  movePlayerOutOfLoading(player, client) {
    client.leave(client.room);
    client.room = this.defaultGameRoom.room;
    client.join(client.room);
    return this.defaultGameRoom.addPlayer(player, client);
  }
  onConnection(client) {
    for (const room of this.roomsForName.values()) {
      room.onConnection(client);
    }

    client.on('disconnect', (reason) => {
      //playersForIds.delete(client.id);
    });
  }
}

module.exports = RoomsManager;
