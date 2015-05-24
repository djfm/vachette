var _ = require('underscore');

var Game = require('./game');


function Room (id, io) {
    this.id = id;

    this.game = new Game();

    this.disconnectedPlayers = {};
    this.status = 'waiting';
    this.statusString = 'Waiting... hit the start button when ready!';

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

    this.addPlayer = function  addPlayer (playerId, socket, joinData) {
        var hasJoined = this.game.hasPlayer(playerId);
        var canJoin = !hasJoined && this.status !== 'playing' && this.status !== 'over';

        if (this.disconnectedPlayers[playerId]) {
            // If there was a connection glitch and player just came back,
            // then forget about removing them from the game.
            clearTimeout(this.disconnectedPlayers[playerId]);
            delete this.disconnectedPlayers[playerId];

            // Taking the identity of someone who left is allowed.
            canJoin = true;
        }

        if (canJoin) {
            this.game.addPlayer(playerId);
            this.game.players[playerId].socket = socket;
            this.game.players[playerId].name = joinData.username;
            socket.on('disconnect', this.playerDisconnected.bind(this, playerId));
            hasJoined = true;
        }

        if (hasJoined) {
            this.broadcast(this.getPublicData());
            this.tellPlayer(playerId, this.getPrivateData(playerId));
        }
    };

    this.renamePlayer = function renamePlayer (playerId, newName) {
        this.game.players[playerId].name = newName;
        this.broadcast(this.getPublicData());
    };

    this.chatMessage = function chatMessage (playerId, message) {
        this.broadcast({
            type: 'chat message',
            username: this.game.players[playerId].name,
            message: message
        });
    };

    this.playerDisconnected = function playerDisconnected (playerId) {
        this.disconnectedPlayers[playerId] = setTimeout(
            this.removePlayer.bind(this, playerId),
            5000
        );
    };

    this.removePlayer = function removePlayer (playerId) {
        delete this.disconnectedPlayers[playerId];
        this.game.removePlayer(playerId);
        this.broadcast(this.getPublicData());

        if (this.game.playerList.length === 0) {
            delete rooms[this.id];
        }
    };

    this.makeMove = function makeMove (playerId, move) {

        var playerName = this.game.players[playerId].name;

        var result = this.game.computeMove(playerId, move);
        if (result.ok) {
            this.game.reflectMove(playerId, result);

            var publicData = this.getPublicData();

            if (result.takeRow !== null) {
                publicData.animatePublicCards = {
                    takeRow: result.takeRow
                };
            }

            this.broadcast(publicData);
            this.tellPlayer(playerId, this.getPrivateData(playerId));

            if (result.take.length > 0) {
                this.broadcast({
                    type: 'chat message',
                    username: 'King-Of-Cows',
                    to: playerName,
                    message: 'Eat some cow!',
                    cssClass: 'oops'
                });
            }
        } else {
            var message = result.message || 'Nope!';

            this.tellPlayer(playerId, {
                type: 'mistake',
                message: message
            });

            this.broadcast({
                type: 'chat message',
                username: 'King-Of-Cows',
                to: playerName,
                message: message,
                cssClass: 'oops'
            });
        }
    };

    this.getPublicData = function getPublicData () {

        var nextPlayerToPlay = this.game.getNextPlayerToPlay(),
            nextPlayerToPlayId = nextPlayerToPlay ? nextPlayerToPlay.id : undefined;

        var started = {};
        var gameOver = true;

        _.each(this.game.players, function (player) {
            started[player.id] = player.started;
            if (player.cards.length > 0) {
                gameOver = false;
            }
        });

        var players = this.game.getPlayersPublicInformation();

        if (gameOver && players.length > 0 && this.status !== 'over') {
            var winner = _.reduce(players, function (winner, player) {
                return player.cowsEaten < winner.cowsEaten ? player : winner;
            }, players[0]);

            this.status = 'over';
            this.statusString = winner.name + ' has won, congratulations!';
            var rematchId = nextRoomId++;
            this.statusString += ' <a href="#/play/' + rematchId + '">rematch?</a>';
        }

        return {
            type: 'publicData',
            publicCards: this.game.publicCards,
            players: players,
            nextPlayerToPlayId: nextPlayerToPlayId,
            status: this.status,
            statusString: this.statusString,
            started: started
        };
    };

    this.getPrivateData = function getPrivateData (playerId) {
        return {
            type: 'privateData',
            privateCards: this.game.players[playerId].cards
        };
    };

    this.intentToStart = function intentToStart (playerId) {
        this.game.players[playerId].started = true;

        var started = _.countBy(this.game.players, function (player) {
            return player.started ? 'yes' : 'no';
        });

        var missing = (started.no || 0) - (started.yes || 0) + 1;

        if ( missing <= 0 ) {
            this.startGame();
        } else {
            this.status = 'confirming';
            this.statusString = 'Waiting for ' + missing + ' more player(s) to accept before starting...';
            this.broadcast(this.getPublicData());
        }
    };

    this.startGame = function startGame () {
        this.status = 'playing';
        this.statusString = 'Game on!!';
        this.game.playing = true;
        this.broadcast(this.getPublicData());
    };
}

var nextRoomId = 0;

var rooms = {};

function createGame (io, id) {
    if (id === undefined) {
        id = nextRoomId++;
    } else {
        nextRoomId = Math.max(nextRoomId, id) + 1;
    }
    rooms[id] = new Room(id, io);
    return rooms[id];
}

module.exports = {
    create: createGame,
    find: function findGame (id) {
        return rooms[id];
    },
    findOrCreate: function findOrCreateGame (id, io) {
        return this.find(id) || this.create(io, id);
    }
};
