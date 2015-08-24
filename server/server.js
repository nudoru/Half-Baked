/**
 * Starting point for an Express/CRUD app
 */

var express          = require('express'),
    http             = require('http'),
    logger           = require('morgan'),
    path             = require('path'),

    app              = express(),
    crudRoutes       = require('./modules/crud'),
    io               = require('./modules/socketio'),
    server,

server = http.Server(app);

app.use(logger('dev'));
app.use(express.static('bin'));

crudRoutes.create(app);
io.connect(server);

server.listen(process.env.PORT || 8080);

module.exports = app;