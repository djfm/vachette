var express     = require('express'),
    http        = require('http'),
    socketIo    = require('socket.io'),
    uid         = require('uid')
;

var room    = require('./room');

var app     = express();
var server  = http.Server(app);
var io      = socketIo(server);

app.use(express.static('public'));

io.on('connection', function (socket) {
    socket.on('join', function (data) {
        room.findOrCreate(data.gameId, io).addPlayer(data.playerId, socket, data);
    });
    socket.on('leave', function (data) {
        var currentRoom = room.find(data.gameId);
        if (currentRoom) {
            currentRoom.removePlayer(data.playerId);
        }
    });
    socket.on('move', function (data) {
        room.find(data.gameId).makeMove(data.playerId, data.move);
    });
    socket.on('start', function (data) {
        room.find(data.gameId).intentToStart(data.playerId);
    });
    socket.on('rename', function (data) {
        room.find(data.gameId).renamePlayer(data.playerId, data.username);
    });
    socket.on('chat message', function (data) {
        room.find(data.gameId).chatMessage(data.playerId, data.message);
    });
});

app.post('/new-game', function (req, res) {
    res.send({
        id: room.create(io).id
    });
});

app.post('/new-player', function (req, res) {
    res.send({
        id: uid()
    });
});

server.listen(process.env.PORT || process.argv[2] || 3000, function () {
    console.log('Ready to roll!');
});
