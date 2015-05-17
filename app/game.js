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

function Game () {
    this.minPlayers = 2;
    this.players = {};
    this.playerList = [];
    this.whoseTurn = 0;
    this.smallestCard = 1;
    this.highestCard = 104;
    this.cardsPerPlayer = 2;
    this.publicCardsCount = 4;
    this.maxRowLength = 5;
    this.publicCards = [];
    this.deck = [];
    this.playing = false;

    this.prepareCards = function prepareCards () {
        this.deck = generateDeckOfCards(this.smallestCard, this.highestCard);
        return this;
    };

    this.dealPublicCards = function dealPublicCards () {
        return _.map(
            this.deck.splice(-this.publicCardsCount, this.publicCardsCount),
            function (card) {
                    return [card];
        });
    };

    this.dealPrivateCards = function dealPrivateCards () {
        return this.deck.splice(-this.cardsPerPlayer, this.cardsPerPlayer);
    };

    this.addPlayer = function addPlayer (id, options) {
        if (this.hasPlayer(id)) {
            return;
        }

        var player = _.defaults(options || {}, {
            ate: [],
            id: id,
            name: id
        });

        player.cards = player.cards || this.dealPrivateCards();

        this.players[id] = player;
        this.playerList.push(player);
    };

    this.hasPlayer = function hasPlayer (id) {
        return _.has(this.players, id);
    };

    this.removePlayer = function removePlayer (id) {
        this.playerList = _.reject(this.playerList, function (player) {
            return player.id === id;
        });

        delete this.players[id];

        this.whoseTurn = this.whoseTurn % this.playerList.length;

        return this;
    };

    this.getHighestCardNumberFromRow = function getHighestCardNumberFromRow (rowNumber) {
        return this.publicCards[rowNumber][this.publicCards[rowNumber].length - 1].number;
    };

    this.computeMove = function computeMove (playerId, move) {
        var player = this.players[playerId];

        if (!this.playing) {
            return {
                ok: false,
                message: 'Game has not started yet!'
            };
        }

        if (this.playerList[this.whoseTurn] !== player) {
            return {
                ok: false,
                message: 'Not your turn!'
            };
        }

        if (!player) {
            return {
                ok: false,
                message: 'No such player.'
            };
        }

        var cardBelongsToPlayer = !!_.find(player.cards, function (card) {
            return card.number === move.card.number;
        });

        if (!cardBelongsToPlayer) {
            return {
                ok: false,
                message: 'You don\'t have this card.'
            };
        }

        var playerDelta;

        playerDelta = move.card.number - this.getHighestCardNumberFromRow(move.rowNumber);
        for (var rowNumber = 0; rowNumber < this.publicCards.length; ++rowNumber) {
            if (rowNumber === move.rowNumber) {
                continue;
            }

            var rowCardNumber = this.getHighestCardNumberFromRow(rowNumber);
            var rowDelta = move.card.number - rowCardNumber;
            if (rowDelta > 0 && rowDelta < playerDelta) {
                return {
                    ok: false,
                    message: 'Card ' + rowCardNumber + ' is closer!'
                };
            } else if (playerDelta < 0 && rowDelta > 0) {
                return {
                    ok: false,
                    message: 'Your card is too small to take this row.'
                };
            }
        }

        var publicCards = _.clone(this.publicCards);
        var take = [];

        if (playerDelta > 0 && this.publicCards[move.rowNumber].length < this.maxRowLength) {
            publicCards[move.rowNumber].push(move.card);
        } else {
            take = this.publicCards[move.rowNumber];
            publicCards[move.rowNumber] = [move.card];
        }

        var privateCards = _.reject(player.cards, function (card) {
            return card.number === move.card.number;
        });

        return {
            ok: true,
            take: take,
            publicCards: publicCards,
            privateCards: privateCards
        };
    };

    this.reflectMove = function reflectMove (playerId, computedMove) {
        var player = this.players[playerId];
        player.cards = computedMove.privateCards;
        player.ate = player.ate.concat(computedMove.take);
        this.publicCards = computedMove.publicCards;
        this.whoseTurn = (this.whoseTurn + 1) % this.playerList.length;
    };

    this.getPlayersPublicInformation = function getPlayersPublicInformation () {
        return _.map(this.playerList, function (privatePlayer, index) {
            var publicPlayer = _.pick(privatePlayer, 'name');

            publicPlayer.theirTurn = (index === this.whoseTurn);
            publicPlayer.cowsEaten = _.reduce(privatePlayer.ate, function (eaten, card) {
                return eaten + card.vachettes;
            }, 0);

            return publicPlayer;
        }, this);
    };

    this.getNextPlayerToPlay = function getNextPlayerToPlay () {
        return this.playerList[this.whoseTurn];
    };

    this.prepareCards();
    this.publicCards = this.dealPublicCards();
}

module.exports = Game;
