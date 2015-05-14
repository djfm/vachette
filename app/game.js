var _ = require('underscore');

function Game (id, io) {
    this.id = id;

    this.minPlayers = 2;
    this.players = {};
    this.playerCount = 0;

    this.sendStatus = function sendStatus () {
        io.emit('game ' + this.id, {
            gameId: this.id,
            playerCount: this.playerCount
        });
    };

    this.addPlayer = function (playerId) {
        if (!this.players[playerId]) {
            this.players[playerId] = {};
            ++this.playerCount;
            this.sendStatus();
        }
    };

    this.playerDisconnected = function (playerId) {
        if (this.players[playerId]) {
            delete this.players[playerId];
            --this.playerCount;
            this.sendStatus();
        }
    };

}

var nextGameId = 0;

var games = {};

module.exports = {
    Game: Game,
    create: function createGame (io) {
        var id = nextGameId++;
        games[id] = new Game(id, io);
        return games[id];
    },
    find: function findGame (id) {
        return games[id];
    },
    playerDisconnected: function playerDisconnected (playerId) {
        _.each(games, function (game) {
            game.playerDisconnected(playerId);
        });
    }
};
