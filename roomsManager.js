//Safer but longer than any of these
//http://stackoverflow.com/questions/8107856/how-to-determine-a-users-ip-address-in-node
var getExternalIP = function(req) {
  return req.headers['x-forwarded-for'] || 
   req.connection.remoteAddress || 
   req.socket.remoteAddress ||
   req.connection.socket.remoteAddress;
};

// TODO: Actually add multiple rooms!