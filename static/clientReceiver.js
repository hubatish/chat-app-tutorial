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
  // Set up name changing.
  $('#name_form').submit(function (e) {
    e.preventDefault();
    var name = $('#name_input').val();
    socket.emit('nameSet', { name: name });
    $("#name_form").hide();
    $("#name_change_btn").text("Change name from " + name);
    $("#name_change_btn").show();
  });
  $("#name_change_btn").click(function () {
    $("#name_form").show();
    $("#name_change_btn").hide();
  });
  $('.start_game_btn').click(function () {
    socket.emit('startGame', {});
    $('#start_game_root').hide();
  });
  $('#end_round_btn').click(function () {
    socket.emit('endRound', {});
  });
  gameManipulator.socket = socket;
});

socket.on('connect', function (data) {
  socket.emit('join', { phoneId: getPhoneId() });
});

socket.on('clientJoin', function (data) {
  id = data.id;
  gameManipulator.onClientJoin(data);
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
