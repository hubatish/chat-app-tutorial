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

io.on('connection', function(client) {
  client.on('join', function(data) {
    client.emit('messages', '7. Hello from server - msg from app.js');
  });

  client.on('messages', function(data) {
    client.emit('broad', data);
    client.broadcast.emit('broad',data);
  });
});

console.log('1.calling for server to start listening from port 4200');
server.listen(4200);
