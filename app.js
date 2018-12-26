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

const RoomsManager = require('./roomsManager');
const roomsManager = new RoomsManager(io);

let port = 8080;
console.log('1.calling for server to start listening from port ' + port);
server.listen(port);
