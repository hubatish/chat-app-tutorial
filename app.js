// app.js
var express = require('express');
var http = require('http');
var socketIo = require('socket.io');

var app = express();
var server = http.createServer(app);  
var io = socketIo(server);

app.use(express.static(__dirname + '/node_modules'));
app.get('/', function(req, res,next) {
  res.sendFile(__dirname + '/index.html');
});

// App logic.
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

let playersForIds = new Map();
function getPlayerNames() {
  const names = [];
  for (const [id, player] of playersForIds) {
    let name = player.name;
    if (name == undefined) {
      name = 'loading';
    }
    names.push(name);
  }
  return names;
}
let room = 'default';

io.on('connection', function(client) {
  client.on('join', function(data) {
    const id = client.id;
    playersForIds.set(id, {});
    client.join(room);
    client.emit('clientJoin', {id});
  });

  client.on('nameSet', function(data) {
    playersForIds.get(client.id).name = data.name;
    io.in(room).emit('allPlayersNames', getPlayerNames());
  });

  client.on('disconnect', (reason) => {
    playersForIds.delete(client.id);
  });
});

console.log('1.calling for server to start listening from port 4200');
server.listen(4200);
