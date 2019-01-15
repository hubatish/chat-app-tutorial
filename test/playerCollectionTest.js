const PlayerCollection = require('../playerCollection');

const playerCollection = new PlayerCollection();
const assert = require('assert');

describe('PlayerCollection', function() {
  describe('#assignRoles', function() {
   it('should give each player a role', function() {
    playerCollection.addUnitializedPlayer("444444", 111);
    //console.log(JSON.stringify(playerCollection));
    playerCollection.addUnitializedPlayer("444445", 112);
    playerCollection.addUnitializedPlayer("444446", 113);
    playerCollection.addUnitializedPlayer("444447", 114);
    playerCollection.addUnitializedPlayer("444448", 115);
    playerCollection.addUnitializedPlayer("444449", 116);
    
    playerCollection.assignRoles();
    
    playerCollection.forEach((id, player) => {
      assert.ok(player.role);
    });
   });
  });
});
