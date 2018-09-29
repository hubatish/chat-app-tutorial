// Can't use nice things like let, const, {name} cause iOs Safari..
// Start socket on both localhost and AWS.
var serverIp = window.location.href;
var socket = io.connect(serverIp);
var id = '';
var phoneId;

function getPhoneId() {
  var cookieConstant = 'werewolfPhoneId';
  phoneId = Cookies.get(cookieConstant);
  if (!phoneId) {
    phoneId = guid();
  }
  Cookies.set(cookieConstant, phoneId, { expires: 1 });
  return phoneId;
}

$(function () {
  // document ready.
  gameManipulator.setUpWithSocket(socket);
});

var socketsMap = new Map();
socketsMap.set('connect', function (data) {
  socket.emit('join', { phoneId: getPhoneId() });
});

socketsMap.set('clientJoin', function (data) {
  id = data.id;
  gameManipulator.onClientJoin();
});

socketsMap.set('rejoin', function (data) {
  // Setup the environment from server data.
  console.log('rejoining! ' + JSON.stringify(data));
  gameManipulator.onClientJoin();
  gameManipulator.changeName(data.player.name);
  gameManipulator.setPlayerNamesList(data.names);
  for (var message of data.player.messages) {
    socketsMap.get(message.messageType)(message);
  }
});

socketsMap.set('gameStatus', function(data) {
  gameManipulator.onGameStatus(data);
});

socketsMap.set('allPlayersNames', function (names) {
  gameManipulator.setPlayerNamesList(names);
});

socketsMap.set('startGame', function (data) {
  gameManipulator.onStartGame(data);
});

socketsMap.set('gameDone', function (data) {
  gameManipulator.onGameDone(data);
});

for (var socketKey of socketsMap.keys()) {
  socket.on(socketKey, socketsMap.get(socketKey));
}
