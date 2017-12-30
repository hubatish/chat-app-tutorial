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

let playersForIds = {};

io.on('connection', function(client) {
  client.on('join', function(data) {
    const id = guid();
    playersForIds[id] = {};
    client.emit('clientJoin', {id});
  });

  client.on('nameSet', function(data) {
    playersForIds[data.id].name = data.name;
    //client.emit('broad', data);
    //client.broadcast.emit('broad',data);
  });
});

console.log('1.calling for server to start listening from port 4200');
server.listen(4200);
