// Game variables.
var GameScene = {
  Welcome: 'Welcome', // Starting screen - enter name/lobby.
  WaitingForGameEnd: 'WaitingForGameEnd', // Game already in progress - wait for new one.
  PlayingGame: 'PlayingGame', // In progress game screen.
  GameEnd: 'GameEnd' // Game has ended, show results.
};

function setListEntries(list_root, names) {
  list_root.empty();
  for (var name of names) {
    list_root.append("<li>" + name + "</li>");
  }
}

class GameManipulator {
  constructor() {
    this.curScene = GameScene.Welcome;
    this.role = Role.Villager;
    this.killedPlayers = [];
    this.currentCountdown = null;
    this.clientNamesList = new ClientNamesList();
  }

  setUpWithSocket(socket) {
    this.socket = socket;
    var self = this;
      // Set up name changing.
    $('#name_form').submit(function (e) {
      e.preventDefault();
      var name = $('#name_input').val();
      socket.emit('nameSet', { name: name });
      self.changeName(name);
      $("#name_change_btn").show();
    });
    $('#name_change_btn').click(function () {
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
    $('#role_show_btn').click(self.showRoleScreen);
    $('#role_hide_btn').click(self.hideRoleScreen);
  }

  clearNewGameValues() {
    // set values equal to their starting values.
    this.role = Role.Villager;
    this.clientNamesList = new ClientNamesList();
    this.cancelCountdown();
  }

  changeName(name) {
    $("#name_form").hide();
    $("#name_change_btn").text("Change name from " + name);
  }
  
  startCountDown(totalSeconds, onDone) {
    this.cancelCountdown();
    var seconds = totalSeconds;
    var countdownText = $('#countdown-text');
    var self = this;
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
      self.currentCountdown = setTimeout(tickSecond, 1000);
    }
    tickSecond();
  }

  cancelCountdown() {
    if (this.currentCountdown != null) {
      clearTimeout(this.currentCountdown);
    }
    this.currentCountdown = null;
  }

  showRoleScreen() {
    $(".role_screen_on").show();
    $(".role_screen_off").hide();
  }

  hideRoleScreen() {
    $(".role_screen_on").hide();
    $(".role_screen_off").show();
  }

  onStartGame(data) {
    console.log('game started msg received' + data.role);
    this.clearNewGameValues();
    this.curScene = GameScene.PlayingGame;
    this.role = data.role;
    // Clear visible elements.
    $('#in_progress_root').hide();
    $('#start_game_root').hide();
    $('.end_game_reveal').hide();
    $('#villager_root').hide();
    $('#werewolf_root').hide();

    // Show some things.
    $('.in_game_reveal').show();
    this.showRoleScreen();
    $('#role_text').text('Role: ' + this.role);
  
    this.startCountDown(data.roundTime, function () {
      //console.log('times up!');
    });

    // handle the ability:
    switch (this.role) {
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
    this.clientNamesList.setGameScene(this.curScene);
  }
  
  onGameDone(data) {
    $('.end_game_reveal').show();
    this.hideRoleScreen();
    $('.in_game_reveal').hide();
    if (data.won) {
      $('#won_game').show();
      $('#lose_game').hide();
    } else {
      $('#lose_game').show();
      $('#won_game').hide();
    }
    this.curScene = GameScene.GameEnd;
    this.clientNamesList.listForGameEnd(data.killedPlayers, data.playerNamesAndRoles);
  }
  
  onClientJoin() {
    $("#name_change_root").show();
    $("#loading").hide();
    $("#player_list_root").show();
  }
  
  goToGameStart() {
    $("#start_game_root").show();
    this.curScene = GameScene.Welcome;
  }

  goToIsInProgress() {
    // Game is already in progress, don't go to start game root.
    $('#in_progress_root').show();
    this.curScene = GameScene.WaitingForGameEnd;
  }

  setPlayerNamesList(names) {
    this.clientNamesList.setPlayerNamesList(names);
  }

  onGameStatus(data) {
    if (data.gameState == GameRoomState.InProgress) {
      this.goToIsInProgress();
    } else {
      this.goToGameStart();
    }
  }
}

gameManipulator = new GameManipulator();
