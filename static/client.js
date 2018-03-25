// Can't use nice things like let, const, {name} cause iOs Safari..
// Start socket on both localhost and AWS.
var serverIp = window.location.href;
var socket = io.connect(serverIp);
var id = '';
var allPlayersNames = [];
var phoneId;

// Game variables.
var GameScene = {
  Welcome: 'Welcome', // Starting screen - enter name/lobby.
  WaitingForGameEnd: 'WaitingForGameEnd', // Game already in progress - wait for new one.
  PlayingGame: 'PlayingGame', // In progress game screen.
  GameEnd: 'GameEnd' // Game has ended, show results.
};
var curScene = GameScene.Welcome;
var Role = {
  Werewolf: 'Werewolf',
  Villager: 'Villager',
  Seer: 'Seer',
  Riddler: 'Riddler'
};
var role = Role.Villager;
var killedPlayers = [];
var votedPlayer = '';
var currentCountdown = null;

function clearNewGameValues() {
  // set values equal to their starting values.
  killedPlayers = [];
  role = Role.Villager;
  votedPlayer = '';
  currentCountdown = null;
}
function guid() {
  // Generate random guid.
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
function getPhoneId() {
  var cookieConstant = 'werewolfPhoneId';
  phoneId = Cookies.get(cookieConstant);
  if (!phoneId) {
    phoneId = guid();
  }
  Cookies.set(cookieConstant, phoneId, { expires: 1 });
  return phoneId;
}
function setListEntries(list_root, names) {
  list_root.empty();
  for (var name of names) {
    list_root.append("<li>" + name + "</li>");
  }
}
function startCountDown(totalSeconds, onDone) {
  if (currentCountdown != null) {
    clearTimeout(currentCountdown);
  }
  var seconds = totalSeconds;
  var countdownText = $('#countdown-text');
  function tickSecond() {
    seconds--;
    var minutes = Math.floor(seconds / 60);
    var displaySeconds = seconds % 60;
    countdownText.text((minutes ? (minutes > 9 ? minutes : minutes) : "0") + ":" + (displaySeconds > 9 ? displaySeconds : "0" + displaySeconds));
    if (seconds == 0) {
      onDone();
      return;
    }
    timer();
  }
  function timer() {
    currentCountdown = setTimeout(tickSecond, 1000);
  }
  tickSecond();
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
    if (curScene == GameScene.Welcome) {
      $("#start_game_root").show();
    }
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
});

socket.on('connect', function (data) {
  socket.emit('join', { phoneId: getPhoneId() });
});

socket.on('clientJoin', function (data) {
  id = data.id;
  // durrr don't really need id...
  // got back id - show the starting screen & hide loading.
  $("#name_change_root").show();
  $("#loading").hide();
  $("#player_list_root").show();
});

socket.on('gameInProgress', function(data) {
  // Game is already in progress, don't go to start game root.
  $('#in_progress_root').show();
  $("#start_game_root").hide();
  curScene = GameScene.WaitingForGameEnd;
});

function setPlayerNamesList(names) {
  allPlayersNames = names;
  $('#player_list').empty();
  for (var name of names) {
    var innerHtml = '<li>' + name;
    if (curScene == GameScene.PlayingGame) {
      innerHtml += '<button id="vote_' + name + '">Vote to Lynch</button>';
      if (votedPlayer == name) {
        innerHtml += "Voted For!"
      }
    }
    if (curScene == GameScene.GameEnd) {
      if (killedPlayers.indexOf(name) != -1) {
        innerHtml += ' Lynched!';
      }
    }
    innerHtml += '</li>';
    $('#player_list').append(innerHtml);
    if (curScene == GameScene.PlayingGame) {
      $('#vote_' + name).click(function (unused) {
        console.log('voted for ' + name);
        votedPlayer = name;
        socket.emit('voteFor', { name: name });
        setPlayerNamesList(allPlayersNames);
      });
    }
  }
}

socket.on('allPlayersNames', function (names) {
  setPlayerNamesList(names);
});

socket.on('startGame', function (data) {
  console.log('game started msg received' + data.role);
  clearNewGameValues();
  curScene = GameScene.PlayingGame;
  role = data.role;
  // Clear visible elements.
  $('#in_progress_root').hide();
  $('#start_game_root').hide();
  $('#end_game').hide();
  $('#villager_root').hide();
  $('#werewolf_root').hide();

  // Show some things.
  $('#ability_root').show();
  $('#role_display_root').show();
  $('#role_text').text('Role: ' + role);

  startCountDown(60, function () {
    //console.log('times up!');
  });
  // handle the ability:
  switch (role) {
    case Role.Werewolf:
      $('#werewolf_root').show();
      setListEntries($('.werewolf_list'), data.werewolves);
      break;
    case Role.Seer:
      $('#villager_root').show();
      $('#villager_info').text('You have seen that ' + data.viewedPlayer.name +
        ' is a ' + data.viewedPlayer.role);
      break;
    case Role.Riddler:
      $('#villager_root').show();
      $('#villager_info').text(data.riddle);
      break;
    case Role.Villager:
      $('#villager_root').show();
      $('#villager_info').text('There are ' + data.numVillagers +
        ' villagers.');
      break;
    default:
      break;
  }
  setPlayerNamesList(allPlayersNames);
});

socket.on('gameDone', function (data) {
  console.log(data);
  $('#end_game').show();
  $('#ability_root').hide();
  if (data.won) {
    $('#won_game').show();
    $('#lose_game').hide();
  } else {
    $('#lose_game').show();
    $('#won_game').hide();
  }
  curScene = GameScene.GameEnd;
  killedPlayers = data.killedPlayers;
  setPlayerNamesList(allPlayersNames);
});
