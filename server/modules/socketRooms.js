var _ = require('lodash-node');

module.exports = function () {

  var _roomMap        = {},
      _maxConnections = 2;

  function getMap() {
    return _.assign({}, _roomMap);
  }

  function createID() {
    return Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
  }

  function create() {
    var roomId       = createID();
    _roomMap[roomId] = [];
    return roomId;
  }

  function isValidID(id) {
    return _roomMap.hasOwnProperty(id);
  }

  function getNumConnections(id) {
    return _roomMap[id].length;
  }

  function connections(id) {
    return _roomMap[id];
  }

  //----------------------------------------------------------------------------
  //  Adding
  //----------------------------------------------------------------------------

  // On CREATE
  function createAndAddConnectionToRoom(socketID) {
    var roomID = create(),
        result = addConnection(roomID, socketID);
    if (!result) {
      return roomID;
    } else {
      return -1;
    }
  }

  // On JOIN
  function addConnection(id, socketID) {
    if (isValidID(id)) {
      if (getNumConnections(id) < _maxConnections) {
        _roomMap[id].push(socketID);
        return;
      } else {
        console.log('Max connections in room ' + id);
        return 'Too many people are in that room.';
      }
    } else {
      console.log('Add to room, no room id ' + id);
      return 'Room ' + id + ' doesn\'t exist.';
    }
  }

  //----------------------------------------------------------------------------
  //  Removal / delete
  //----------------------------------------------------------------------------

  function removeConnection(id, connection) {
    if (isValidID(id)) {
      console.log('Remove connection on room ' + id);
      var idx = _roomMap[id].indexOf(connection);
      _roomMap[id].splice(idx, 1);
      return true;
    } else {
      console.log('Remove from room, no room id ' + id);
      return false;
    }
  }

  function remove(id) {
    if (isValidID(id)) {
      console.log('Deleting room ' + id + ' with ' + _roomMap[id].length + 'connections');
      delete _roomMap[id];
      return true;
    } else {
      console.log('No room to delete ' + id);
    }
    return false;
  }

  return {
    getMap                      : getMap,
    createID                    : createID,
    create                      : create,
    isValidID                   : isValidID,
    connections                 : connections,
    getNumConnections           : getNumConnections,
    createAndAddConnectionToRoom: createAndAddConnectionToRoom,
    addConnection               : addConnection,
    removeConnection            : removeConnection,
    remove                      : remove
  };
};