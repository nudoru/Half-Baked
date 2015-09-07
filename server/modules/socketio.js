var socketIO               = require('socket.io'),
    _                      = require('lodash-node'),
    _moment                = require('moment'),
    _events                = require('./socketioevents'),
    _io,
    _lastConnectedSocket,
    _lastConnectedSocketID,
    _connectionsMap        = {},
    _roomMap               = {},
    _connectionsCount      = 0,
    _maxConnectionsPerRoom = 2;

//----------------------------------------------------------------------------
//  Server
//----------------------------------------------------------------------------

module.exports = {
  connect: function (server) {
    _io = socketIO(server);
    _io.on('connection', onConnect);
  }
};

function onConnect(socket) {
  _lastConnectedSocket   = socket;
  _lastConnectedSocketID = socket.id;

  console.log('Client connected', _lastConnectedSocketID);
  addConnectionToMap(socket.id, socket);

  _lastConnectedSocket.on(_events.NOTIFY_SERVER, onNotifyServer);
  _lastConnectedSocket.on('disconnect', onDisconnect);

  emitClientNotification(_events.CONNECT, getConnectionsForID(_lastConnectedSocketID).name);
  //broadcastClientNotification(_events.USER_CONNECTED, getConnectionsForID(_lastConnectedSocketID).name);
}

//----------------------------------------------------------------------------
//  Connections map
//----------------------------------------------------------------------------

function addConnectionToMap(id, socket) {
  _connectionsMap[id] = {
    name         : 'Connection' + _connectionsCount++,
    id           : id,
    socket       : socket,
    connected    : true,
    status       : null,
    playerDetails: {}
  };
}

function updatePlayerDetails(id, details) {
  _connectionsMap[id].playerDetails = details;
}

function getPlayerDetails() {
  var details = [];
  for (var id in _connectionsMap) {
    if (_connectionsMap.hasOwnProperty(id)) {
      details.push(_connectionsMap[id].playerDetails);
    }
  }
  return details;
}

function getConnectionsForID(id) {
  return _.assign({}, _connectionsMap[id]);
}

function pruneConnectionsMap() {
  var socketList = _io.sockets.server.eio.clients, notifyRoom, status = true;
  for (var id in _connectionsMap) {
    if (_connectionsMap.hasOwnProperty(id)) {
      if (socketList[id] === undefined) {
        status = false;

        for (var roomid in _roomMap) {
          if (_roomMap.hasOwnProperty(roomid)) {
            var idx = _roomMap[roomid].indexOf(id);
            if (idx >= 0) {
              console.log('the disconnect was in room', roomid);
              _roomMap[roomid].splice(idx, 1);
              notifyRoom = roomid;
            }
          }
        }

        broadcastClientNotification(_events.USER_DISCONNECTED, id);
        delete _connectionsMap[id];

        if (notifyRoom) {
          emitClientNotificationToRoom(notifyRoom, _events.GAME_ABORT, 'A player disconnected! The game was aborted.');
          deleteRoom(notifyRoom);
        }

      } else {
        console.log(id, ' OK');
      }
    }
  }

  return status;
}

//----------------------------------------------------------------------------
//  Events
//----------------------------------------------------------------------------

function onNotifyServer(payload) {
  handleSocketMessage(payload);
}

function handleSocketMessage(payload) {
  if (!payload) {
    return;
  }

  console.log("from client", payload);

  switch (payload.type) {
    case (_events.PING):
      emitClientNotification(_events.PONG, {});
      return;
    case (_events.PONG):
      console.log('CLINT PING!');
      return;
    case (_events.CONNECT):
      console.log("Connected!");
      return;
    case (_events.CREATE_ROOM):
      updatePlayerDetails(payload.connectionID, payload.payload.playerDetails);
      createAndAddConnectionToRoom(payload.connectionID);
      return;
    case (_events.JOIN_ROOM):
      updatePlayerDetails(payload.connectionID, payload.payload.playerDetails);
      addConnectionToRoom(payload.payload.roomID, payload.connectionID);
      return;
    case (_events.LEAVE_ROOM):
      console.log("leave room");
      return;
    default:
      //console.warn("Unhandled SocketIO message type", payload);
      return;
  }
}

// Remove from room, end game
function onDisconnect() {
  console.log('disconnect');
  _connectionsCount--;
  pruneConnectionsMap();
  //broadcastClientNotification(_events.USER_DISCONNECTED);
}

//----------------------------------------------------------------------------
//  Room
//----------------------------------------------------------------------------

function createRoomID() {
  return Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
}

function createRoom() {
  var roomId       = createRoomID();
  _roomMap[roomId] = [];
  return roomId;
}

function isValidRoomID(roomID) {
  return _roomMap.hasOwnProperty(roomID);
}

function getNumConnectionsInRoom(roomID) {
  return _roomMap[roomID].length;
}

//----------------------------------------------------------------------------
//  Adding
//----------------------------------------------------------------------------

function createAndAddConnectionToRoom(socketID) {
  var roomID  = createRoom(),
      success = addConnectionToRoom(roomID, socketID);
  if (success) {
    emitClientNotificationToConnection(socketID, _events.JOIN_ROOM, {roomID: roomID});
  } else {
    emitClientNotificationToConnection(socketID, _events.MESSAGE, 'Error creating and adding to room.');
  }
}

function addConnectionToRoom(roomID, socketID) {
  if (isValidRoomID(roomID)) {
    console.log('Add socketID to room ' + roomID);
    if (getNumConnectionsInRoom(roomID) < _maxConnectionsPerRoom) {
      _roomMap[roomID].push(socketID);
      emitClientNotificationToConnection(socketID, _events.JOIN_ROOM, {roomID: roomID});
      checkForGameStart(roomID);
      return true;
    } else {
      console.log('Max connections in room ' + roomID);
      emitClientNotificationToConnection(socketID, _events.MESSAGE, 'Too many people are in that room.');
    }
  } else {
    console.log('Add to room, no room id ' + roomID);
    emitClientNotificationToConnection(socketID, _events.MESSAGE, 'That room doesn\'t exist on the server');
  }
  return false;
}

function checkForGameStart(roomID) {
  if (_roomMap[roomID].length === 2) {
    console.log('STARTING ...');
    _roomMap[roomID].forEach(function (socketID) {
      emitClientNotificationToConnection(socketID, _events.GAME_START, {
        roomID : roomID,
        players: getPlayerDetails()
      });
    });
    return;
  }
  console.log('Not ready to start');
}

//----------------------------------------------------------------------------
//  Removal / delete
//----------------------------------------------------------------------------

function removeConnectionFromRoom(roomID, connection) {
  if (isValidRoomID(roomID)) {
    console.log('Remove connection to room ' + roomID);
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
    //emitClientNotificationToRoom(roomID, _events.GAME_ABORT, 'For some reason the room was deleted!');
    delete _roomMap[roomID];
    return true;
  } else {
    console.log('No room to delete ' + roomID);
  }
  return false;
}

//----------------------------------------------------------------------------
//  Communication to client
//----------------------------------------------------------------------------

function formattedDate() {
  return _moment().format('h:mm:ss a');
}

function emitClientNotificationToConnection(connectionID, type, payload) {
  var socket = getConnectionsForID(connectionID).socket;
  socket.emit(_events.NOTIFY_CLIENT, {
    type   : type,
    id     : _lastConnectedSocketID,
    time   : formattedDate(),
    payload: payload
  });
}

function emitClientNotificationToRoom(roomID, type, payload) {
  _roomMap[roomID].forEach(function (socket) {
    emitClientNotificationToConnection(socket, type, payload);
  });
}

function emitClientNotification(type, payload) {
  _lastConnectedSocket.emit(_events.NOTIFY_CLIENT, {
    type   : type,
    id     : _lastConnectedSocketID,
    time   : formattedDate(),
    payload: payload
  });
}

function broadcastClientNotification(type, payload) {
  _io.emit(_events.NOTIFY_CLIENT, {
    type   : type,
    id     : _lastConnectedSocketID,
    time   : formattedDate(),
    payload: payload
  });
}