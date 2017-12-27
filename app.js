// app.js
var express = require('express');
var http = require('http');
var socketIo = require('socket.io');

var app = express();
var server = http.createServer(app);  
var io = socketIo(server);

app.use(express.static(__dirname + '/node_modules'));  
app.get('/', function(req, res,next) {  
  //2
  console.log('2. sending file index.html');
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(client) {
  //4.5
  console.log('4. Client connected from app.js...');

  client.on('join', function(data) {
    //6
    console.log(data);
    //7
    client.emit('messages', '7. Hello from server - msg from app.js');
  });

  client.on('join22', function(data) {
    console.log(data);
    client.emit('messages', '8. Hello from server - msg from app.js');
  });

  client.on('messages', function(data) {
    client.emit('broad', data);
    client.broadcast.emit('broad',data);
  });
});

//1
console.log('1.calling for server to start listening from localhost 4200');
server.listen(4200);
