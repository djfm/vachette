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

        player.socket.emit('game ' + this.id, {
            type: 'cards',
            gameId: this.id,
            cards: player.cards
        });
    };

    this.makeMove = function makeMove (playerId, move) {
        this.publicCards[move.rowNumber].push(move.card);
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
