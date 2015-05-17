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
        room.findOrCreate(data.gameId, io).addPlayer(data.playerId, socket);
    });
    socket.on('move', function (data) {
        room.find(data.gameId).makeMove(data.playerId, data.move);
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
