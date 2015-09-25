var _ = require('lodash-node');

module.exports = function () {

  var _connections = {},
      _count       = 0;

  function get() {
    return _.assign({}, _connections);
  }

  function getID(id) {
    return _.assign({}, _connections[id]);
  }

  function set(map) {
    _connections = map;
  }

  function add(id, socket) {
    _connections[id] = {
      name         : 'Connection' + _count++,
      id           : id,
      socket       : socket,
      connected    : true,
      status       : null,
      playerDetails: {}
    };
  }

  function remove(id) {
    delete _connections[id];
  }

  function removeBySocket(socket) {
    Object.keys(_connections).forEach(id => {
      if (_connections.hasOwnProperty(id)) {
        if (_connections[id].socket === socket) {
          delete _connections[id];
        }
      }
    });
  }

  function setPlayerDetails(id, details) {
    _connections[id].playerDetails = details;
  }

  function getPlayerDetails(id) {
    return _.assign({}, getID(id).playerDetails);
  }

  function getAllPlayerDetails() {
    var details = [];
    Object.keys(_connections).forEach(id => {
      if (_connections.hasOwnProperty(id)) {
        details.push(_connections[id].playerDetails);
      }
    });
    return details;
  }

  return {
    get                : get,
    set                : set,
    getID              : getID,
    add                : add,
    remove             : remove,
    removeBySocket     : removeBySocket,
    setPlayerDetails   : setPlayerDetails,
    getPlayerDetails   : getPlayerDetails,
    getAllPlayerDetails: getAllPlayerDetails
  }

};