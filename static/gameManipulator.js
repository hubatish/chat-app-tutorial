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
    this.votedPlayer = '';
    this.currentCountdown = null;    
    this.allPlayersNames = [];
  }

  clearNewGameValues() {
    // set values equal to their starting values.
    this.killedPlayers = [];
    this.role = Role.Villager;
    this.votedPlayer = '';
    this.cancelCountdown();
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

  onStartGame(data) {
    console.log('game started msg received' + data.role);
    this.clearNewGameValues();
    this.curScene = GameScene.PlayingGame;
    this.role = data.role;
    // Clear visible elements.
    $('#in_progress_root').hide();
    $('#start_game_root').hide();
    $('#end_game').hide();
    $('#villager_root').hide();
    $('#werewolf_root').hide();
  
    // Show some things.
    $('#ability_root').show();
    $('#role_display_root').show();
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
    this.setPlayerNamesList(this.allPlayersNames);
  }
  
  onGameDone(data) {
    $('#end_game').show();
    $('#ability_root').hide();
    if (data.won) {
      $('#won_game').show();
      $('#lose_game').hide();
    } else {
      $('#lose_game').show();
      $('#won_game').hide();
    }
    this.curScene = GameScene.GameEnd;
    this.killedPlayers = data.killedPlayers;
    this.setPlayerNamesList(this.allPlayersNames);
  }
  
  onClientJoin(data) {
    $("#name_change_root").show();
    $("#loading").hide();
    $("#player_list_root").show();
  }
  
  onGameStatus(data) {
    if (data.gameState == GameRoomState.InProgress) {
      // Game is already in progress, don't go to start game root.
      $('#in_progress_root').show();
      this.curScene = GameScene.WaitingForGameEnd;
    } else {
      $("#start_game_root").show();
    }
  }
  
  setPlayerNamesList(names) {
    this.allPlayersNames = names;
    $('#player_list').empty();
    var numButtonLoop = 0;
    var self = this;
    for (var nameLoop of names) {
      var wrapper = function() {
        var name = nameLoop; // wrap name for closure rather than as loop variable.
        var numButton = numButtonLoop;
        var innerHtml = '<li>' + name;
        if (self.curScene == GameScene.PlayingGame) {
          innerHtml += '<button id="vote_' + numButton + '">Vote to Lynch</button>';
          if (self.votedPlayer == name) {
            innerHtml += "Voted For!"
          }
        }
        if (self.curScene == GameScene.GameEnd) {
          if (self.killedPlayers.indexOf(name) != -1) {
            innerHtml += ' Lynched!';
          }
        }
        innerHtml += '</li>';
        $('#player_list').append(innerHtml);
        if (self.curScene == GameScene.PlayingGame) {
          $('#vote_' + numButton).click(function (unused) {
            console.log('voted for ' + name);
            self.votedPlayer = name;
            self.socket.emit('voteFor', { name: name });
            self.setPlayerNamesList(self.allPlayersNames);
          });
        }  
      }();
      numButtonLoop += 1;
    }
  }
}

gameManipulator = new GameManipulator();
