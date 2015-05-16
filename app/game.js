var _ = require('underscore');

function generateDeckOfCards (smallestCard, highestCard) {
    var deck = [];

    for (var i = smallestCard; i <= highestCard; ++i) {
        var vachettes = 1;

        if (i % 5 === 0) {
            vachettes = 2;
        }

        if (i % 10 === 0) {
            vachettes = 3;
        }

        if (i % 11 === 0) {
            vachettes = 5;
        }

        if (i === 55) {
            vachettes = 7;
        }

        deck.push({
            number: i,
            vachettes: vachettes
        });
    }

    return _.shuffle(deck);
}

function Game (id, io) {
    this.id = id;

    this.minPlayers = 2;
    this.players = {};
    this.playerCount = 0;
    this.playerList = [];
    this.whoseTurn = 0;

    this.statusString = 'Waiting for more players...';
    this.status = 'waiting';

    /**
     * Game statuses
     *
     *	waiting
     *		=> ready (when this.minPlayers is reached)
     *	ready
     *		=> playing (when first move is made)
     *
     */

    this.smallestCard = 1;
    this.highestCard = 104;
    this.cardsPerPlayer = 10;
    this.publicCardsCount = 4;
    this.maxRowLength = 5;

    this.publicCards = [];

    this.reset = function reset () {
        this.whoseTurn = 0;
        this.status = 'waiting';

        _.each(this.players, function (player) {
            player.ate = [];
        });

        this.deck = generateDeckOfCards(this.smallestCard, this.highestCard);

        this.publicCards = _.map(
            this.deck.splice(-this.publicCardsCount, this.publicCardsCount),
            function (card) {
                    return [card];
        });

        this.broadcast({
            type: 'publicCards',
            cards: this.publicCards
        });

        _.each(this.players, function (player) {
            this.dealToPlayer(player, this.deck);
        }, this);
    };

    this.broadcast = function broadcast (message) {
        io.emit('game ' + this.id, _.defaults(message, {
            gameId: this.id
        }));
    };

    this.tellPlayer = function tellPlayer (playerId, message) {
        if (this.players[playerId].socket) {
            this.players[playerId].socket.emit('game ' + this.id, _.defaults(message, {
                gameId: this.id
            }));
        }
    };

    this.sendStatus = function sendStatus () {
        this.broadcast({
            type: 'status',
            playerCount: this.playerCount,
            statusString: this.statusString,
            players: _.map(this.playerList, function (player, index) {
                player = _.pick(player, 'id', 'name', 'ate');
                player.theirTurn = (index === this.whoseTurn);
                return player;
            }, this)
        });
    };

    this.addPlayer = function (playerId, socket) {
        if (!this.players[playerId] && this.status !== 'playing') {
            this.players[playerId] = {
                socket: socket,
                name: playerId,
                id: playerId,
                ate: []
            };

            this.playerList.push(this.players[playerId]);

            this.dealToPlayer(this.players[playerId], this.deck);

            if (socket) {
                socket.on('disconnect', this.playerDisconnected.bind(this, playerId));
            }

            ++this.playerCount;

            this.tellPlayer(playerId, {
                type: 'publicCards',
                cards: this.publicCards
            });

            if (this.playerCount >= this.minPlayers) {
                this.status = 'ready';
                this.statusString = 'Ready when you are! (other players may join until first move is made)';
            }

            this.sendStatus();
        }
    };

    this.startGame = function startGame () {
        this.status = 'playing';
        this.statusString = 'Game on!';
        this.sendStatus();
    };

    this.playerDisconnected = function (playerId) {

        this.playerList = _.reject(this.playerList, function (player) {
            return player.id === playerId;
        });

        delete this.players[playerId];
        --this.playerCount;

        this.whoseTurn = this.whoseTurn % this.playerList.length;

        if (this.playerCount < this.minPlayers) {
            this.reset();
        }

        this.sendStatus();
    };

    this.dealToPlayer = function dealToPlayer (player, deck) {
        player.cards = deck.splice(-this.cardsPerPlayer, this.cardsPerPlayer).sort(function (a, b) {
            return a.number - b.number;
        });

        this.updatePlayerCards(player);
    };

    this.updatePlayerCards = function updatePlayerCards (player) {
        player.socket.emit('game ' + this.id, {
            type: 'privateCards',
            gameId: this.id,
            cards: player.cards
        });
    };

    this.makeMove = function makeMove (playerId, move) {

        if (this.status === 'ready') {
            this.startGame();
        }

        if (this.playerList[this.whoseTurn].id === playerId) {
            this.notifyMove(this.tryMove(playerId, move));
        } else {
            this.tellPlayer(playerId, {
                type: 'splash',
                message: 'Not your turn!'
            });
        }
    };

    this.getRowHighestNumber = function getRowHighestNumber (rowNumber) {
        return this.publicCards[rowNumber][this.publicCards[rowNumber].length - 1].number;
    };

    this.tryMove = function (playerId, move) {
        var player = this.players[playerId];
        player.ate = player.ate || [];

        var ok = !!_.find(player.cards, function (card) {
            return card.number === move.card.number;
        });

        var playerDelta;

        var errorMessage = 'Nope!';

        if (ok) {
            playerDelta = move.card.number - this.getRowHighestNumber(move.rowNumber);
            for (var rowNumber = 0; rowNumber < this.publicCards.length; ++rowNumber) {
                if (rowNumber === move.rowNumber) {
                    continue;
                }
                var rowDelta = move.card.number - this.getRowHighestNumber(rowNumber);
                if (rowDelta > 0 && rowDelta < playerDelta) {
                    errorMessage = 'There is another card that is closer!';
                    ok = false;
                    break;
                } else if (playerDelta < 0 && rowDelta > 0) {
                    errorMessage = 'Not small enough to take this!';
                    ok = false;
                    break;
                }
            }
        } else {
            errorMessage = 'Cheating?';
        }

        if (ok) {
            if (playerDelta > 0 && this.publicCards[move.rowNumber].length < this.maxRowLength) {
                this.publicCards[move.rowNumber].push(move.card);
            } else {
                player.ate = player.ate.concat(this.publicCards[move.rowNumber]);
                this.publicCards[move.rowNumber] = [move.card];
            }

            player.cards = _.reject(player.cards, function (card) {
                return card.number === move.card.number;
            });

            this.whoseTurn = (this.whoseTurn + 1) % this.playerList.length;
        } else {
            this.tellPlayer(playerId, {
                type: 'splash',
                message: errorMessage
            });
        }

        return {
            ok: ok,
            player: player,
            publicCards: this.publicCards
        };
    };

    this.notifyMove = function (moveResult) {
        this.updatePlayerCards(moveResult.player);
        this.broadcast({
            type: 'publicCards',
            cards: this.publicCards
        });
        this.sendStatus();
    };
}

var nextGameId = 0;

var games = {};

module.exports = {
    Game: Game,
    create: function createGame (io, id) {
        if (id === undefined) {
            id = nextGameId++;
        } else {
            nextGameId = Math.max(nextGameId, id) + 1;
        }
        games[id] = new Game(id, io);

        games[id].reset();

        return games[id];
    },
    find: function findGame (id) {
        return games[id];
    },
    findOrCreate: function findOrCreateGame (id, io) {
        return this.find(id) || this.create(io, id);
    }
};
