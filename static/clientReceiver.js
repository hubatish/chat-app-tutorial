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

socket.on('connect', function (data) {
  socket.emit('join', { phoneId: getPhoneId() });
});

socket.on('clientJoin', function (data) {
  id = data.id;
  gameManipulator.onClientJoin();
});

socket.on('rejoin', function (data) {
  // Setup the environment from server data.
  console.log('rejoining! ' + JSON.stringify(data));
  gameManipulator.onClientJoin();
  gameManipulator.changeName(data.player.name);
  gameManipulator.setPlayerNamesList(data.names);
  if (data.gameState == GameRoomState.Lobby) {
    gameManipulator.goToGameStart();
  } else if (data.gameState == GameRoomState.InProgress) {
    if (data.playerInLobby) {
      // Player isn't playing!
      gameManipulator.goToIsInProgress();      
    } else {
      console.log('go to ingame goodness' + JSON.stringify(data.player));
      //gameManipulator.
    }
  }
  //gameManipulator.
/*  gameManipulator.onGameStatus(data.gameStatus);
  if (this.gameState == GameRoomState.Lobby) {
    client.emit('gameStatus', {
      gameState: this.gameState,
    });
  } else if (this.gameState == GameRoomState.InProgress) {
    if (foundPlayer.gameStartMessage) {
      client.emit('startGame', foundPlayer.gameStartMessage);
    }
  }*/
});

socket.on('gameStatus', function(data) {
  gameManipulator.onGameStatus(data);
});

socket.on('allPlayersNames', function (names) {
  gameManipulator.setPlayerNamesList(names);
});

socket.on('startGame', function (data) {
  gameManipulator.onStartGame(data);
});

socket.on('gameDone', function (data) {
  gameManipulator.onGameDone(data);
});
