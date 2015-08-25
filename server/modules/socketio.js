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
}

function onNotifyServer(payload) {
  console.log('FROM client: ',payload.payload);
}

function createRoomID() {
  return ( Math.random() * 100000 ) | 0;
}

function onDisconnect() {
  console.log('disconnect');
  connectionsCount--;
  broadcastClientNotification(eventConstants.DISCONNECT);
}

function prettyNow() {
  return moment().format('h:mm:ss a');
}

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

function emitClientNotification(type, payload) {
  currentSocket.emit(eventConstants.NOTIFY_CLIENT, {
    type   : type,
    id     : currentID,
    time   : prettyNow(),
    payload: payload
  });
}

function broadcastClientNotification(type, payload) {
  io.emit(eventConstants.NOTIFY_CLIENT, {
    type   : type,
    id     : currentID,
    time   : prettyNow(),
    payload: payload
  });
}


