var SocketIO               = require('socket.io'),
    _                      = require('lodash-node'),
    Moment                 = require('moment'),
    _events                = require('./socketioevents'),
    Connections            = require('./socketConnections.js')(),
    Rooms                  = require('./socketRooms.js')(),
    _io,
    _lastConnectedSocket,
    _lastConnectedSocketID,
    _roomMap               = {},
    _maxConnectionsPerRoom = 2,
    _testRoomID            = '0000';

//----------------------------------------------------------------------------
//  Server
//----------------------------------------------------------------------------

module.exports = {
  connect: server => {
    _io = SocketIO(server);
    _io.on('connection', onConnect);
  }
};

function onConnect(socket) {
  _lastConnectedSocket   = socket;
  _lastConnectedSocketID = socket.id;

  console.log('Client connected', _lastConnectedSocketID);
  Connections.add(socket.id, socket);

  _lastConnectedSocket.on(_events.NOTIFY_SERVER, onNotifyServer);
  _lastConnectedSocket.on('disconnect', onDisconnect);

  emitClientNotification(_events.CONNECT, Connections.getID(_lastConnectedSocketID).name);
  //broadcastClientNotification(_events.USER_CONNECTED, Connections.getID(_lastConnectedSocketID).name);
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

  console.log("Client: ", payload.type);

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
      createRoom(payload.connectionID, payload.payload.playerDetails);
      return;
    case (_events.JOIN_ROOM):
      joinRoom(payload.connectionID, payload.payload.playerDetails, payload.payload.roomID);
      return;
    case (_events.LEAVE_ROOM):
      leaveRoom(payload.connectionID, payload.payload.roomID);
      return;
    case (_events.SEND_PLAYER_DETAILS):
      Connections.setPlayerDetails(payload.connectionID, payload.payload.playerDetails);
      sendUpdatedPlayerDetails(payload.payload.roomID);
      return;
    case(_events.SEND_QUESTION):
      sendQuestion(payload.connectionID, payload.payload);
      return;
    case(_events.OPPONENT_ANSWERED):
      sendOpponentResult(payload.connectionID, payload.payload);
      return;
    default:
      console.warn("Unhandled SocketIO message type", payload);
      return;
  }
}

function createRoom(connectionID, playerDetails) {
  var roomID = Rooms.createAndAddConnectionToRoom(connectionID);

  Connections.setPlayerDetails(connectionID, playerDetails);

  if (roomID !== -1) {
    emitClientNotificationToConnection(connectionID, _events.JOIN_ROOM, {roomID: roomID});
    checkForGameStart(roomID);
  }
}

function joinRoom(connectionID, playerDetails, roomID) {
  var result = Rooms.addConnection(roomID, connectionID);

  Connections.setPlayerDetails(connectionID, playerDetails);

  if (!result) {
    emitClientNotificationToConnection(connectionID, _events.JOIN_ROOM, {roomID: roomID});
    checkForGameStart(roomID);
  } else {
    emitClientNotificationToConnection(connectionID, _events.MESSAGE, result);
  }
}

function leaveRoom(connectionID, roomID) {
  var success = Rooms.removeConnection(roomID, connectionID);
  if (success) {
    emitClientNotificationToConnection(connectionID, _events.MESSAGE, 'You\'ve left room ' + roomID + '.');
  } else {
    // because room doesn't exist
    //emitClientNotificationToConnection(connectionID, _events.MESSAGE, 'Something went wrong leaving ' + roomID + '.');
  }
}

// Remove from room, end game
function onDisconnect() {
  pruneConnectionsMap();
}

//----------------------------------------------------------------------------
//  Connections map
//----------------------------------------------------------------------------

function pruneConnectionsMap() {
  var socketList  = _io.sockets.server.eio.clients,
      connections = Connections.get(),
      rooms       = Rooms.getMap(),
      roomToNotify,
      status      = true;

  Object.keys(connections).forEach(socketID => {
    if (connections.hasOwnProperty(socketID)) {
      if (socketList[socketID] === undefined) {
        status = false;

        console.log('Disconnect ', socketID);

        Object.keys(rooms).forEach(roomid => {
          if (rooms.hasOwnProperty(roomid)) {
            var idx = rooms[roomid].indexOf(socketID);
            if (idx >= 0) {
              console.log('the disconnect was in room', roomid);
              Rooms.removeConnection(roomid, socketID);
              roomToNotify = roomid;
            }
          }
        });

        broadcastClientNotification(_events.USER_DISCONNECTED, socketID);
        Connections.remove(socketID);

        if (roomToNotify) {
          emitClientNotificationToRoom(roomToNotify, _events.GAME_ABORT, 'A player disconnected! The game was aborted.');
          Rooms.remove(roomToNotify);
        }

      }
    }
  });

  return status;
}

//----------------------------------------------------------------------------
//  Game communication
//----------------------------------------------------------------------------

function getPlayerDetailsForRoom(roomID) {
  var roomConnections = Rooms.connections(roomID);
  return roomConnections.map(socketID => Connections.getPlayerDetails(socketID));
}

function checkForGameStart(roomID) {
  if (Rooms.getNumConnections(roomID) === 2) {
    var roomConnections = Rooms.connections(roomID),
        playersInRoom   = getPlayerDetailsForRoom(roomID),
        playerNames     = playersInRoom.map(details => details.name);

    broadcastNotification('Starting game in room ' + roomID + ' between ' + playerNames.join(' and '));

    console.log('STARTING ...', playerNames);

    roomConnections.forEach(socketID => {
      emitClientNotificationToConnection(socketID, _events.GAME_START, {
        roomID : roomID,
        players: playersInRoom
      });
    });
    return;
  }

  console.log('Not ready to start');
}

function sendUpdatedPlayerDetails(roomID) {
  var roomConnections = Rooms.connections(roomID);

  if (roomID === _testRoomID || !roomID) {
    console.log('sendUpdatedPlayerDetails on test socket');
    return;
  }

  if (!roomConnections) {
    console.log('sendUpdatedPlayerDetails: No connections in room: ', roomID);
    return;
  }

  roomConnections.forEach(socketID => {
    emitClientNotificationToConnection(socketID, _events.SEND_PLAYER_DETAILS, {
      roomID : roomID,
      players: getPlayerDetailsForRoom(roomID)
    });
  });
}

function sendQuestion(srcConnection, payload) {
  var roomID          = payload.roomID,
      roomConnections = Rooms.connections(roomID),
      question        = payload.question;

  if (roomID === _testRoomID || !roomID) {
    console.log('sendQuestion on test socket');
    emitClientNotificationToConnection(srcConnection, _events.SEND_QUESTION, {
      question: question
    });
    return;
  }

  if (!roomConnections) {
    console.log('sendQuestion: No connections in room: ', roomID);
    return;
  }

  roomConnections.forEach(socketID => {
    if (socketID !== srcConnection) {
      emitClientNotificationToConnection(socketID, _events.SEND_QUESTION, {
        question: question
      });
    }
  });
}

function sendOpponentResult(srcConnection, payload) {
  var roomID          = payload.roomID,
      roomConnections = Rooms.connections(roomID),
      result          = payload.result;

  if (roomID === _testRoomID || !roomID) {
    console.log('sendQuestion on test socket');
    emitClientNotificationToConnection(srcConnection, _events.OPPONENT_ANSWERED, {
      result: result
    });
    return;
  }

  if (!roomConnections) {
    console.log('sendOpponentResult: No connections in room: ', roomID);
    return;
  }

  roomConnections.forEach(socketID => {
    if (socketID !== srcConnection) {
      emitClientNotificationToConnection(socketID, _events.OPPONENT_ANSWERED, {
        result: result
      });
    }
  });
}

//----------------------------------------------------------------------------
//  Communication to client
//----------------------------------------------------------------------------

function formattedDate() {
  return Moment().format('h:mm:ss a');
}

function emitClientNotificationToConnection(connectionID, type, payload) {
  var socket = Connections.getID(connectionID).socket;
  socket.emit(_events.NOTIFY_CLIENT, {
    type   : type,
    id     : _lastConnectedSocketID,
    time   : formattedDate(),
    payload: payload
  });
}

function emitClientNotificationToRoom(roomID, type, payload) {
  Rooms.connections(roomID).forEach(function (socket) {
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

function broadcastNotification(message) {
  broadcastClientNotification(_events.SYSTEM_MESSAGE, message);
}