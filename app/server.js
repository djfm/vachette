var express     = require('express'),
    http        = require('http'),
    socketIo    = require('socket.io'),
    uid         = require('uid')
;

var game        = require('./game');

var app     = express();
var server  = http.Server(app);
var io      = socketIo(server);

app.use(express.static('public'));

io.on('connection', function (socket) {
    socket.on('join', function (data) {
        game.find(data.gameId).addPlayer(data.playerId, socket);
    });
});

app.post('/new-game', function (req, res) {
    res.send({
        id: game.create(io).id
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
