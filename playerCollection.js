const util = require('./static/util');
const enums = require('./static/roleDefinitions');
const Role = enums.Role;
const Team = enums.Team;
const teamForRole = enums.teamForRole;

class PlayerCollection {
  constructor() {
    this.playersForId = new Map();
  }
  addUnitializedPlayer(id) {
    this.playersForId.set(id, {
      name: 'load' + id.substr(0, 5),
      nameSet: false,
      id,
    });
  }
  removePlayer(id) {
    const player = this.playersForId.get(id);
    this.playersForId.delete(id);
    return player;
  }
  getPlayer(id) {
    return this.playersForId.get(id);
  }
  addPlayer(player) {
    this.playersForId.set(player.id, player);
  }
  transferPlayerToOther(id, otherCollection) {
    otherCollection.addPlayer(this.removePlayer(id));
  }
  /** playerFunc takes player & returns new/edited player. */
  modifyPlayer(id, playerFunc) {
    this.playersForId.set(id, playerFunc(this.playersForId.get(id)));
  }
  /**
   * Do something to each (can edit).
   * func takes (id, player) & returns new/edited player.
   */
  forEach(func) {
    for (const entry of this.playersForId.entries()) {
      const newValue = func(entry[0], entry[1]);
      if (newValue) {
        this.playersForId.set(entry[0], newValue);        
      }
    }
  }
  /** Utility functions below! */
  getPlayerNames() {
    const names = [];
    // So sad can't use [id, player] of..
    // Cause only node 5.6 on windows.
    // Instead just iterate over values.
    for (const player of this.playersForId.values()) {
      names.push(player.name);
    }
    return names;
  }
  getWerewolfNames() {
    const names = [];
    for (const player of this.playersForId.values()) {
      if (player.role == Role.Werewolf) {
        names.push(player.name);  
      }
    }
    return names;
  }  
  findPlayerByName(name) {
    for (const entry of this.playersForId) {
      const id = entry[0];
      const player = entry[1];
      if (name == player.name) {
        return player;
      }
    }
    return {};
  }  
  countPlayersByRole(role) {
    let numRole = 0;
    for (const player of this.playersForId.values()) {
      const id = player.id;
      if (role == player.role) {
        numRole += 1;
      }
    }
    return numRole;
  }  
  getRandomPlayerExceptIds(ids) {
    const playerIds = Array.from(this.playersForId.keys());
    for (const id of ids) {
      playerIds.splice(playerIds.indexOf(id), 1);    
    }
    if (playerIds.length == 0) {
      return {};
    }
    const r = util.getRandomInt(0, playerIds.length);
    return this.playersForId.get(playerIds[r]);
  }
  
  getRandomPlayerExceptId(id) {
    return this.getRandomPlayerExceptIds([id]);
  }
  /** Game functions! Should probably move these to something else. */
  assignRoles() {
    const roleSet = [];
    const players = this.playersForId.values();
    let maxWerewolves = players.length < 4 ? 1 : 2;
    for (let i=0; i<= maxWerewolves; i++) {
      roleSet.push(Role.Werewolf);
    }
    // Add singleton roles.
    roleSet.push(Role.Seer);
    const extraCards = players.length < 4 ? 1 : 3;
    for (let i = roleSet.length; i < players.length + extraCards; i++) {
      // Add roles with multiple people.
      if (util.getRandomInt(0, 3) == 0) {
        roleSet.push(Role.Villager);      
      } else {
        roleSet.push(Role.Riddler);
      }
    }
    for (const player of this.playersForId.values()) {
      const id = player.id;
      const r = util.getRandomInt(0, roleSet.length);
      this.playersForId.get(id).role = roleSet[r];
      roleSet.splice(r, 1);
    }
  }
  generateRiddle(id) {
    const player1 = this.getRandomPlayerExceptId(id);
    if (!player1.role) {
      return 'What happens to a story if no one is there to hear it?';
    }
    const player2 = this.getRandomPlayerExceptIds([id, player1.id]);
    if (!player2.role) {
      return "Don't trust anyone.";
    }
    const sameTeam =
        teamForRole[player1.role] == teamForRole[player2.role] ?
        'same' : 'opposite';
    return player1.name + ' is on the ' + sameTeam + ' team as ' +
        player2.name;
  }
}

module.exports = PlayerCollection;