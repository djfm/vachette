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

    this.statusString = 'Waiting for more players...';
    this.status = 'waiting';

    this.smallestCard = 1;
    this.highestCard = 104;
    this.cardsPerPlayer = 10;
    this.publicCardsCount = 4;
    this.maxRowLength = 5;

    this.publicCards = [];

    this.broadcast = function broadcast (message) {
        io.emit('game ' + this.id, _.defaults(message, {
            gameId: this.id
        }));
    };

    this.sendStatus = function sendStatus () {
        this.broadcast({
            type: 'status',
            playerCount: this.playerCount,
            statusString: this.statusString
        });
    };

    this.addPlayer = function (playerId, socket) {
        if (!this.players[playerId] && this.status === 'waiting') {
            this.players[playerId] = {
                socket: socket
            };

            socket.on('disconnect', this.playerDisconnected.bind(this, playerId));

            ++this.playerCount;
            this.sendStatus();

            if (this.playerCount >= this.minPlayers) {
                this.startGame();
            }
        }
    };

    this.playerDisconnected = function (playerId) {
        delete this.players[playerId];
        --this.playerCount;

        if (this.playerCount < this.minPlayers) {
            this.status = 'waiting';
        }

        this.sendStatus();
    };

    this.startGame = function startGame () {
        this.status = 'playing';
        this.statusString = 'Game on!';
        this.sendStatus();

        this.deal();
    };

    this.deal = function deal () {
        var deck = generateDeckOfCards(this.smallestCard, this.highestCard);

        _.each(this.players, function (player) {
            this.dealToPlayer(player, deck);
        }, this);

        this.publicCards = _.map(
            deck.splice(-this.publicCardsCount, this.publicCardsCount),
            function (card) {
                    return [card];
        });

        this.broadcast({
            type: 'publicCards',
            cards: this.publicCards
        });
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
        this.notifyMove(this.tryMove(playerId, move));
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

        if (ok) {
            playerDelta = move.card.number - this.getRowHighestNumber(move.rowNumber);
            for (var rowNumber = 0; rowNumber < this.publicCards.length; ++rowNumber) {
                if (rowNumber === move.rowNumber) {
                    continue;
                }
                var rowDelta = move.card.number - this.getRowHighestNumber(rowNumber);
                if (rowDelta > 0 && rowDelta < playerDelta) {
                    ok = false;
                    break;
                } else if (playerDelta < 0 && rowDelta > 0) {
                    ok = false;
                    break;
                }
            }
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
    }
};
