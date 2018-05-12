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

module.exports = {
  Team,
  Role,
  teamForRole,
};
