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
    var self = this;
    this.clientNamesList = new ClientNamesList(function(name) {
      self.socket.emit('voteFor', { name: name });
    });
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
      $("#name_change_btn").removeClass('d-none');
    });
    $('#name_change_btn').click(function () {
      $("#name_form").removeClass('d-none');
      $("#name_change_btn").addClass('d-none');
    });
    $('.start_game_btn').click(function () {
      socket.emit('startGame', {});
      $('.start_game_root').addClass('d-none');
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
    this.clientNamesList.setToDefaults();
    this.cancelCountdown();
  }

  changeName(name) {
    $("#name_form").addClass('d-none');
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
    $(".role_screen_on").removeClass('d-none');
    $(".role_screen_off").addClass('d-none');
  }

  hideRoleScreen() {
    $(".role_screen_on").addClass('d-none');
    $(".role_screen_off").removeClass('d-none');
  }

  onStartGame(data) {
    console.log('game started msg received' + data.role);
    this.clearNewGameValues();
    this.curScene = GameScene.PlayingGame;
    this.role = data.role;
    // Clear visible elements.
    $('#in_progress_root').addClass('d-none');
    $('.start_game_root').addClass('d-none');
    $('.end_game_reveal').addClass('d-none');
    $('#villager_root').addClass('d-none');
    $('#werewolf_root').addClass('d-none');

    // Show some things.
    $('.in_game_reveal').removeClass('d-none');
    this.showRoleScreen();
    $('.role_text').text('Role: ' + this.role);
  
    this.startCountDown(data.roundTime, function () {
      //console.log('times up!');
    });

    // handle the ability:
    switch (this.role) {
      case Role.Werewolf:
        $('#werewolf_root').removeClass('d-none');
        setListEntries($('.werewolf_list'), data.werewolves);
        break;
      case Role.Seer:
        $('#villager_root').removeClass('d-none');
        $('#villager_info').text('You have seen that ' + data.viewedPlayer.name +
          ' is a ' + data.viewedPlayer.role);
        break;
      case Role.Riddler:
        $('#villager_root').removeClass('d-none');
        $('#villager_info').text(data.riddle);
        break;
      case Role.Villager:
        $('#villager_root').removeClass('d-none');
        $('#villager_info').text('There are ' + data.numVillagers +
          ' villagers.');
        break;
      default:
        break;
    }
    this.clientNamesList.setGameScene(this.curScene);
  }
  
  onGameDone(data) {
    $('.end_game_reveal').removeClass('d-none');
    this.hideRoleScreen();
    $('.in_game_reveal').addClass('d-none');
    if (data.won) {
      $('#won_game').removeClass('d-none');
      $('#lose_game').addClass('d-none');
    } else {
      $('#lose_game').removeClass('d-none');
      $('#won_game').addClass('d-none');
    }
    this.curScene = GameScene.GameEnd;
    this.clientNamesList.listForGameEnd(data.killedPlayers, data.playerNamesAndRoles);
  }
  
  onClientJoin() {
    $("#name_change_root").removeClass('d-none');
    $("#loading").addClass('d-none');
    $("#player_list_root").removeClass('d-none');
  }
  
  goToGameStart() {
    $(".start_game_root").removeClass('d-none');
    this.curScene = GameScene.Welcome;
  }

  goToIsInProgress() {
    // Game is already in progress, don't go to start game root.
    $('#in_progress_root').removeClass('d-none');
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
