var socketIO         = require('socket.io'),
    _                = require('lodash-node'),
    moment           = require('moment'),
    eventConstants   = require('./socketioevents'),
    io,
    currentSocket,
    currentID,
    connectionsMap   = Object.create(null),
    connectionsCount = 0,
    maxConnections   = 2;

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
  currentSocket = socket;
  currentID     = socket.id;
  connectionsCount++;
  console.log('Client connected', currentID);
  addConnectionToMap(currentID);

  currentSocket.on(eventConstants.NOTIFY_SERVER, onNotifyServer);
  currentSocket.on('disconnect', onDisconnect);

  emitClientNotification(eventConstants.CONNECT, getConnectionsMapForID(currentID).name);
  broadcastClientNotification(eventConstants.USER_CONNECTED, getConnectionsMapForID(currentID).name);
}

function onNotifyServer(payload) {
  handleSocketMessage(payload)
}

function onDisconnect() {
  console.log('disconnect');
  connectionsCount--;
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
  return ( Math.random() * 100000 ) | 0;
}



//----------------------------------------------------------------------------
//  Connections map
//----------------------------------------------------------------------------

function addConnectionToMap(id) {
  connectionsMap[id] = {
    name     : 'Connection' + connectionsCount,
    id       : id,
    connected: true,
    status   : null
  };
}

function getConnectionsMapForID(id) {
  return _.assign({}, connectionsMap[id]);
}

//----------------------------------------------------------------------------
//  Communication to client
//----------------------------------------------------------------------------

function formattedDate() {
  return moment().format('h:mm:ss a');
}

function emitClientNotification(type, payload) {
  currentSocket.emit(eventConstants.NOTIFY_CLIENT, {
    type   : type,
    id     : currentID,
    time   : formattedDate(),
    payload: payload
  });
}

function broadcastClientNotification(type, payload) {
  io.emit(eventConstants.NOTIFY_CLIENT, {
    type   : type,
    id     : currentID,
    time   : formattedDate(),
    payload: payload
  });
}


