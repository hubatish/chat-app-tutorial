/** Displays the list of player names, with whatever various actions go along with that. */
class ClientNamesList {
  constructor(onVoteFor) {
    this.curScene = GameScene.Welcome;
    this.allPlayersNames = [];
    this.setToDefaults();
    this.onVoteFor = onVoteFor;
  }

  setToDefaults() {
    this.killedPlayers = [];
    this.votedPlayer = '';
    this.playerNamesAndRoles = [];
  }

  setPlayerNamesList(names) {
    this.allPlayersNames = names;
    this.refreshList();
  }

  setGameScene(scene) {
    this.curScene = scene;
    this.refreshList();
  }

  listForGameEnd(killedPlayers, playerNamesAndRoles) {
    this.curScene = GameScene.GameEnd;
    this.killedPlayers = killedPlayers;
    this.playerNamesAndRoles = playerNamesAndRoles;
    this.refreshList();
  }

  /** Refreshes the list of player names, with whatever additional information has been prepped. */
  refreshList() {
    $('#player_list').empty();
    var numButtonLoop = 0;
    var self = this;
    for (var nameLoop of self.allPlayersNames) {
      var wrapper = function() {
        var name = nameLoop; // wrap name for closure rather than as loop variable.
        var numButton = numButtonLoop;
        var innerHtml = '<li>' + name;
        if (self.curScene == GameScene.PlayingGame) {
          innerHtml += '<button id="vote_' + numButton + '" class="btn btn-primary">Vote to Lynch</button>';
          if (self.votedPlayer == name) {
            innerHtml += "Voted For!"
          }
        }
        if (self.curScene == GameScene.GameEnd) {
          innerHtml += ' was a ' + self.findRoleByName(name);
          if (self.killedPlayers.indexOf(name) != -1) {
            innerHtml += ' & was lynched!';
          }
        }
        innerHtml += '</li>';
        $('#player_list').append(innerHtml);
        if (self.curScene == GameScene.PlayingGame) {
          $('#vote_' + numButton).click(function (unused) {
            console.log('voted for ' + name);
            self.votedPlayer = name;
            self.onVoteFor(name);
            self.refreshList();
          });
        }  
      }();
      numButtonLoop += 1;
    }
  }

  findRoleByName(name) {
    for (var nameRole of this.playerNamesAndRoles) {
      if (nameRole.name == name) {
        return nameRole.role;
      }
    }
    return '';
  }
}