var socketIO              = require('socket.io'),
    _                     = require('lodash-node'),
    moment                = require('moment'),
    eventConstants        = require('./socketioevents'),
    io,
    _currentSocket,
    _currentID,
    _connectionsMap        = {},
    _roomMap               = {},
    _connectionsCount      = 0,
    _maxConnectionsPerRoom = 2;

//----------------------------------------------------------------------------
//  Server
//----------------------------------------------------------------------------

module.exports = {
  connect: function (server) {
    io = socketIO(server);
    io.on('connection', onConnect);
  }
};

function onConnect(socket) {
  _currentSocket = socket;
  _currentID     = socket.id;
  _connectionsCount++;
  console.log('Client connected', _currentID);
  addConnectionToMap(_currentID);

  _currentSocket.on(eventConstants.NOTIFY_SERVER, onNotifyServer);
  _currentSocket.on('disconnect', onDisconnect);

  emitClientNotification(eventConstants.CONNECT, getConnectionsMapForID(_currentID).name);
  broadcastClientNotification(eventConstants.USER_CONNECTED, getConnectionsMapForID(_currentID).name);
}

function onNotifyServer(payload) {
  handleSocketMessage(payload);
}

function onDisconnect() {
  console.log('disconnect');
  _connectionsCount--;
  broadcastClientNotification(eventConstants.USER_DISCONNECTED);
}

function handleSocketMessage(payload) {
  if (!payload) {
    return;
  }

  console.log("from client", payload);

  switch (payload.type) {
    case (eventConstants.PING):
      emitClientNotification(eventConstants.PONG, {});
      return;
    case (eventConstants.PONG):
      console.log('CLINT PING!');
      return;
    case (eventConstants.CONNECT):
      console.log("Connected!");
      return;
    case (eventConstants.CREATE_ROOM):
      console.log("create room");
      return;
    case (eventConstants.JOIN_ROOM):
      console.log("join room");
      return;
    case (eventConstants.LEAVE_ROOM):
      console.log("leave room");
      return;
    default:
      //console.warn("Unhandled SocketIO message type", payload);
      return;
  }
}

//----------------------------------------------------------------------------
//  Room
//----------------------------------------------------------------------------

function createRoomID() {
  return ( Math.random() * 100000 ) || 0;
}

function createRoom() {
  var roomId      = createRoomID;
  _roomMap[roomId] = [];
  return roomId;
}

function createAndAddConnectionToRoom(connection) {
  var roomID = createRoom;
  return addConnectionToRoom(roomID, connection);
}

function isValidRoomID(roomID) {
  return _roomMap.hasOwnProperty(roomID);
}

function getNumConnectionsInRoom(roomID) {
  return _roomMap[roomID].length;
}

function deleteRoom(roomID) {
  if (isValidRoomID(roomID)) {
    console.log('Deleting room ' + roomID + ' with ' + _roomMap[roomID].length + 'connections');
    // TODO disconnect? or at least notify
    //roomMap[roomMap].forEach(function(connection) {
    //  // tell 'em
    //});
    delete _roomMap[roomID];
    return true;
  } else {
    console.log('No room to delete ' + roomID);
  }
  return false;
}

function addConnectionToRoom(roomID, connection) {
  if (isValidRoomID(roomID)) {
    console.log('Add connection to room ' + roomID);
    if(getNumConnectionsInRoom(roomID) < _maxConnectionsPerRoom) {
      _roomMap[roomID].push(connection);
      return true;
    } else {
      console.log('Max connections in room ' + roomID);
    }
  } else {
    console.log('Add to room, no room id ' + roomID);
  }
  return false;
}

function removeConnectionFromRoom(roomID, connection) {
  if (isValidRoomID(roomID)) {
    console.log('Add connection to room ' + roomID);
    var idx = _roomMap[roomID].indexOf(connection);
    _roomMap[roomID].splice(idx, 1);
    return true;
  } else {
    console.log('Remove from room, no room id ' + roomID);
    return false;
  }
}

//----------------------------------------------------------------------------
//  Connections map
//----------------------------------------------------------------------------

function addConnectionToMap(id) {
  _connectionsMap[id] = {
    name     : 'Connection' + _connectionsCount,
    id       : id,
    connected: true,
    status   : null
  };
}

function getConnectionsMapForID(id) {
  return _.assign({}, _connectionsMap[id]);
}

//----------------------------------------------------------------------------
//  Communication to client
//----------------------------------------------------------------------------

function formattedDate() {
  return moment().format('h:mm:ss a');
}

function emitClientNotification(type, payload) {
  _currentSocket.emit(eventConstants.NOTIFY_CLIENT, {
    type   : type,
    id     : _currentID,
    time   : formattedDate(),
    payload: payload
  });
}

function broadcastClientNotification(type, payload) {
  io.emit(eventConstants.NOTIFY_CLIENT, {
    type   : type,
    id     : _currentID,
    time   : formattedDate(),
    payload: payload
  });
}


