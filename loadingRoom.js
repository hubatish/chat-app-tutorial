const enums = require('./roleDefinitions');
const allPlayers = require('./allPlayers');
const PlayerCollection = require('./playerCollection');

class LoadingRoom {
  constructor() {
    this.playersForId = new Map();    
    this.room = 'loading-room-1';
  }
  setUpIo(socketServer) {
    this.io = socketServer;
    io.on('connection', function(client) {
      client.on('join', function(data) {
        const id = client.id;
        playersForIds.set(id, {
          name: 'load' + id.substr(0, 5),
          nameSet: false,
          id,
        });
        client.join(room);
        client.emit('clientJoin', {id});
      });
    });  
  }
}