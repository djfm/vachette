var _ = require('underscore');

var Game = require('./game');


function Room (id, io) {
    this.id = id;

    this.game = new Game();

    function sendMessage (socket, data) {
        socket.emit('game ' + this.id, _.defaults(data, {
            gameId: this.id
        }));
    }

    this.broadcast = function broadcast (message) {
        sendMessage.call(this, io, message);
        return this;
    };

    this.tellPlayer = function tellPlayer (playerId, message) {
        sendMessage.call(this, this.game.players[playerId].socket, message);
        return this;
    };

    this.addPlayer = function  addPlayer (playerId, socket) {
        if (!this.game.hasPlayer(playerId)) {
            this.game.addPlayer(playerId, {
                socket: socket
            });
            socket.on('disconnect', this.removePlayer.bind(this, playerId));
        }
        this.tellPlayer(playerId, this.getPublicData());
        this.tellPlayer(playerId, this.getPrivateData(playerId));
    };

    this.removePlayer = function removePlayer (playerId) {
        this.game.removePlayer(playerId);
    };

    this.makeMove = function makeMove (playerId, move) {
        var result = this.game.computeMove(playerId, move);
        if (result.ok) {
            this.game.reflectMove(playerId, result);
            this.broadcast(this.getPublicData());
            this.tellPlayer(playerId, this.getPrivateData(playerId));
        } else {
            this.tellPlayer(playerId, {
                type: 'mistake',
                message: result.message || 'Nope!'
            });
        }
    };

    this.getPublicData = function getPublicData () {
        return {
            type: 'publicData',
            publicCards: this.game.publicCards,
            players: this.game.getPlayersPublicInformation(),
            nextPlayerToPlayId: this.game.getNextPlayerToPlay().id
        };
    };

    this.getPrivateData = function getPrivateData (playerId) {
        return {
            type: 'privateData',
            privateCards: this.game.players[playerId].cards
        };
    };
}

var nextRoomId = 0;

var rooms = {};

module.exports = {
    create: function createGame (io, id) {
        if (id === undefined) {
            id = nextRoomId++;
        } else {
            nextRoomId = Math.max(nextRoomId, id) + 1;
        }
        rooms[id] = new Room(id, io);
        return rooms[id];
    },
    find: function findGame (id) {
        return rooms[id];
    },
    findOrCreate: function findOrCreateGame (id, io) {
        return this.find(id) || this.create(io, id);
    }
};
