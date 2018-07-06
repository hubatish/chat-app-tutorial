const GameRoom = require('./gameRoom');
const LoadingRoom = require('./loadingRoom');
const PlayerCollection = require('./playerCollection');

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
    // Phone id -> room.
    this.roomsForId = new Map();
    // Room name -> actual room object.
    this.roomsForRoomName = new Map();
    this.startLoadingRoom = new LoadingRoom(io, this);
    this.roomsForRoomName.set(this.startLoadingRoom.roomName, this.startLoadingRoom);
    // TODO: Make multiple at some point.
    this.defaultGameRoom = new GameRoom(io);
    this.roomsForRoomName.set(this.defaultGameRoom.roomName, this.defaultGameRoom);

    io.on('connection', (client) => {this.onConnection(client); });
  }

  /** Try to move a player into a game room. Returns fail or not. */
  movePlayerOutOfLoading(client, player) {
    console.log('moving out of loading' + JSON.stringify(player));
    this.movePlayerIntoRoom(client, player.phoneId, this.defaultGameRoom);
    return this.defaultGameRoom.addPlayer(client, player);
  }
  onConnection(client) {
    for (const room of this.roomsForRoomName.values()) {
      room.onConnection(client);
    }

    const self = this;
    client.on('disconnect', (reason) => {
      //playersForIds.delete(client.id);
    });
    client.on('join', function(data) {
      // Handle data.phoneId from client and use in order to rejoin in process game.
      const existingRoom = self.roomsForId.get(data.phoneId);
      if (existingRoom) {
        console.log('adding ' + data.phoneId + ' to existing room');
        self.movePlayerIntoRoom(client, data.phoneId, existingRoom);
        existingRoom.addUnitializedPlayer(client, data.phoneId);
      } else {
        console.log('adding to loading');
        self.movePlayerIntoRoom(client, data.phoneId, self.startLoadingRoom);
        self.startLoadingRoom.addUnitializedPlayer(client, data.phoneId);
      }
    });
  }
  movePlayerIntoRoom(client, phoneId, room) {
    if (client.room) {
      client.leave(client.room);
    }
    client.room = room.roomName;
    client.join(room.roomName);
    console.log('moving player into room' + room.roomName);
    this.roomsForId.set(phoneId, room);
  }
}

module.exports = RoomsManager;
