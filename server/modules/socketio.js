var socket_io        = require('socket.io'),
    moment           = require('moment'),
    eventConstants   = require('./socketioevents'),
    io,
    connectionsMap   = Object.create(null),
    connectionsCount = 0,
    maxConnections   = 2;


function prettyNow() {
  return moment().format('h:mm:ss a');
}

function addConnectionToMap(id) {
  connectionsMap[id] = {
    name     : 'Anonymous' + connectionsCount++,
    id       : id,
    connected: true,
    status   : null
  };
}

function getConnectionsMapForID(id) {
  return connectionsMap[id];
}

module.exports = {
  io: {},

  connect: function (server) {
    io = socket_io(server);

    io.on('connection', function (socket) {
      var id = socket.id,
          ip = socket.request.connection.remoteAddress;

      var clientIp = socket.request.connection.remoteAddress;
      //https://github.com/socketio/socket.io/issues/1387

      console.log('Client connected', ip, id);

      addConnectionToMap(id);

      sendSystemAnnouncement(getConnectionsMapForID(id).name + ' has joined.');

      function sendSystemAnnouncement(message) {
        io.emit('message', {
          time    : prettyNow(),
          username: 'System',
          message : message
        });
      }

      //socket.on('message', function (message) {
      //  socket.broadcast.emit('message', {
      //    username: getConnectionsMapForID(id).nick,
      //    message : message.message
      //  });
      //});

      //socket.on('nickchange', function (nick) {
      //  var oldnick                     = getConnectionsMapForID(id).nick;
      //  getConnectionsMapForID(id).nick = nick;
      //  sendUpdatedUsersList();
      //  sendSystemAnnouncement(oldnick + ' changed nick to ' + nick + '.');
      //});

      //socket.on('disconnect', function () {
      //  console.log('disconnect');
      //  getConnectionsMapForID(id).connected = false;
      //  sendSystemAnnouncement(getConnectionsMapForID(id).nick + ' has left.');
      //  sendUpdatedUsersList();
      //  io.emit('user disconnected');
      //});

      //function sendUpdatedUsersList() {
      //  io.emit('userupdate', getActiveUsersList());
      //}

    });

  }
};

