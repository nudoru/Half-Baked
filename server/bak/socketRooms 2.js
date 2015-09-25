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

  function createRoom() {
    var roomId       = createID();
    _roomMap[roomId] = [];
    return roomId;
  }

  function isValidRoomID(roomID) {
    return _roomMap.hasOwnProperty(roomID);
  }

  function getNumConnectionsInRoom(roomID) {
    return _roomMap[roomID].length;
  }

  function connections(id) {
    return _roomMap[id];
  }

  //----------------------------------------------------------------------------
  //  Adding
  //----------------------------------------------------------------------------

  // On CREATE
  // TODO split this up
  function createAndAddConnectionToRoom(socketID) {
    console.log('create and add connections');
    var roomID = createRoom(),
        result = addConnectionToRoom(roomID, socketID);
    if (!result) {
      return roomID;
    } else {
      return -1;
    }
  }

  // On JOIN
  function addConnectionToRoom(roomID, socketID) {
    if (isValidRoomID(roomID)) {
      if (getNumConnectionsInRoom(roomID) < _maxConnections) {
        _roomMap[roomID].push(socketID);
        return;
      } else {
        console.log('Max connections in room ' + roomID);
        return 'Too many people are in that room.';
      }
    } else {
      console.log('Add to room, no room id ' + roomID);
      return 'Room ' + roomID + ' doesn\'t exist.';
    }
  }

  //----------------------------------------------------------------------------
  //  Removal / delete
  //----------------------------------------------------------------------------

  function removeConnectionFromRoom(roomID, connection) {
    if (isValidRoomID(roomID)) {
      console.log('Remove connection on room ' + roomID);
      var idx = _roomMap[roomID].indexOf(connection);
      _roomMap[roomID].splice(idx, 1);
      return true;
    } else {
      console.log('Remove from room, no room id ' + roomID);
      return false;
    }
  }

  function deleteRoom(roomID) {
    if (isValidRoomID(roomID)) {
      console.log('Deleting room ' + roomID + ' with ' + _roomMap[roomID].length + 'connections');
      delete _roomMap[roomID];
      return true;
    } else {
      console.log('No room to delete ' + roomID);
    }
    return false;
  }

  return {
    getMap                      : getMap,
    createID                    : createID,
    createRoom                  : createRoom,
    isValidRoomID               : isValidRoomID,
    connections                 : connections,
    getNumConnectionsInRoom     : getNumConnectionsInRoom,
    createAndAddConnectionToRoom: createAndAddConnectionToRoom,
    addConnectionToRoom         : addConnectionToRoom,
    removeConnectionFromRoom    : removeConnectionFromRoom,
    deleteRoom                  : deleteRoom
  };
};