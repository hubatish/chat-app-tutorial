// app.js
'use strict';
var express = require('express');
var http = require('http');
var socketIo = require('socket.io');

var app = express();
var server = http.createServer(app);  
var io = socketIo(server);

var players = require('./playerCollection');

app.use(express.static(__dirname + '/node_modules'));
app.use(express.static(__dirname + '/static'));
app.get('/', function(req, res,next) {
  res.sendFile(__dirname + '/index.html');
});

// App logic.
const roleDefinitions = require('./roleDefinitions');
const Role = roleDefinitions.Role;
const Team = roleDefinitions.Team;
const teamForRole = roleDefinitions.teamForRole;
const GameRoom = require('./gameRoom');
const LoadingRoom = require('./loadingRoom');

const roomManager = {
  movePlayerOutOfLoading: function(player, client) {
    defaultGameRoom.addPlayer(player, client);
  }
};
// Player id -> room name.
const roomNameForId = new Map();
// Room name -> actual room object.
const roomForName = new Map();
const startLoadingRoom = new LoadingRoom(io, roomManager);
roomForName.set(startLoadingRoom.room, startLoadingRoom);
// TODO: Make multiple at some point.
const defaultGameRoom = new GameRoom(io);
roomForName.set(defaultGameRoom.room, defaultGameRoom);

io.on('connection', function(client) {
  for (const room of roomForNames.values()) {
    room.onConnection(client);
  }

  client.on('disconnect', (reason) => {
    playersForIds.delete(client.id);
  });
});

console.log('1.calling for server to start listening from port 4200');
server.listen(4200);
