const Role = {
  Werewolf: 'Werewolf',
  Villager: 'Villager',
  Seer: 'Seer',
  Riddler: 'Riddler'
};

const Team = {
  Villagers: 'Villagers',
  Werewolves: 'Werewolves'
};

const teamForRole = new Map();
teamForRole.set(Role.Werewolf, Team.Werewolves);
teamForRole.set(Role.Villager, Team.Villagers);
teamForRole.set(Role.Seer, Team.Villagers);
teamForRole.set(Role.Riddler, Team.Villagers);

const GameRoomState = {
  Lobby: 'Lobby',
  InProgress: 'InProgress',
  Done: 'Done',
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    Team,
    Role,
    teamForRole,
    GameRoomState,
  };
} else {
  // could set these on window but they already are!
}
