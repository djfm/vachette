var View    = require('./view'),
    $       = require('jquery'),
    q       = require('q'),
    _       = require('underscore')
;

var serverNotifications = require('../server-notifications');

var PlayGameView = View.extend({
    template: require('./templates/play-game.jade'),
    events: {
    },
    setup: function playGameViewSetup (gameId, playerId) {
        this.gameId = parseInt(gameId, 10);

        function setURL () {
            this.url = '#/play/' + gameId + '/' + playerId;
        }

        if (!playerId) {
            var that = this;
            return $.post('/new-player').then(function (data) {
                that.playerId = playerId = data.id;
                setURL.call(that);
                history.replaceState(null, null, that.url);
            });
        } else {
            this.playerId = playerId;
            setURL.call(this);
            return q(null);
        }
    },
    afterRender: function playGameViewAfterRender () {
        $('.currentGame').html('<a href="' + this.url + '">current game</a>');
        this.setupServerListeners();
        this.joinGame();
    },
    setupServerListeners: function setupServerListeners () {
        var that = this;
        serverNotifications.socket.on('game ' + this.gameId, function (data) {
            if (that.gameId === data.gameId) {
                if (data.type === 'status') {
                    that.updateGameStatus(data);
                } else if (data.type === 'cards') {
                    that.setPrivateCards(data.cards);
                } else if (data.type === 'publicCards') {
                    that.setPublicCards(data.cards);
                }
            }
        });
    },
    joinGame: function joinGame () {
        serverNotifications.socket.emit('join', {
            gameId: this.gameId,
            playerId: this.playerId
        });
    },
    updateGameStatus: function updateGameStatus (gameData) {
        this.$('.playerCount').html(gameData.playerCount);
        this.$('.status').html(gameData.statusString);
    },
    setPrivateCards: function setPrivateCards (cards) {
        this.privateCards = cards;
        this.$('.hand-of-cards').html(
            require('./templates/hand-of-cards.jade')({
                cards: this.privateCards,
                openCardTemplate: require('./templates/open-card.jade')
        }));

    },
    setPublicCards: function setPublicCards (cards) {
        this.publicCards = cards;

        var cardsForTemplate = _.map(this.publicCards, function (row) {
            return {
                cards: row,
                full: row.length >= 5
            };
        });

        this.$('.public-cards').html(
            require('./templates/public-cards.jade')({
                rows: cardsForTemplate,
                openCardTemplate: require('./templates/open-card.jade')
        }));
    }
});

module.exports = PlayGameView;
