var View    = require('./view'),
    $       = require('jquery'),
    q       = require('q'),
    _       = require('underscore')
;

$.event.props.push('dataTransfer');

var serverNotifications = require('../server-notifications');

var PlayGameView = View.extend({
    template: require('./templates/play-game.jade'),
    events: {
        'dragstart .hand-of-cards-container': 'onOpenCardDragStart',
        'dragover .card-slot': 'onDragOverCardSlot',
        'dragenter .card-slot': 'onDragEnterCardSlot',
        'dragleave .card-slot': 'onDragLeaveCardSlot',
        'drop .card-slot': 'onDropOverCardSlot'
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
                } else if (data.type === 'privateCards') {
                    that.setPrivateCards(data.cards);
                } else if (data.type === 'publicCards') {
                    that.setPublicCards(data.cards);
                } else if (data.type === 'splash') {
                    that.splash(data.message);
                } else if (data.type === 'ok move') {
                    that.consecutiveErrorCount = 0;
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
        var playerCountString;

        if (gameData.playerCount > 1) {
            playerCountString = 'There are ' + gameData.playerCount + ' players connected.';
        } else {
            playerCountString = 'You\'re the only connected player...';
        }

        var myTurn = false;

        var players = _.map(gameData.players, function (player) {
            player.vachettes = _.reduce(player.ate, function (total, card) {
                return total + card.vachettes;
            }, 0);

            if (player.id === this.playerId) {
                player.you = true;
                if (player.theirTurn) {
                    myTurn = true;
                }
            }

            return player;
        }, this);

        this.$('.my-turn').css('visibility', myTurn ? 'visible' : 'hidden');

        this.$('.playerCount').html(playerCountString);
        this.$('.status').html(gameData.statusString);
        this.$('.players').html(require('./templates/players.jade')({
            players: players
        }));
    },
    splash: function splash (message) {

        this.consecutiveErrorCount = (this.consecutiveErrorCount || 0) + 1;

        if (this.consecutiveErrorCount >= 3) {
            message = 'Are you dumb?';
        }

        this.$('.splash-message').html(message);

        var elem = this.$('.splash')
        .addClass('fade')
        .width(this.$('.container').width())
        .height(this.$('.public-area').height())
        .css('visibility', 'visible')
        .css('opacity', 0)
        .bind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function () {
            elem.css('visibility', 'hidden').css('opacity', 1);
        });
    },
    setPrivateCards: function setPrivateCards (cards) {
        this.privateCards = cards;
        this.drawPrivateCards();
    },
    drawPrivateCards: function drawPrivateCards () {
        this.$('.hand-of-cards').html(
            require('./templates/hand-of-cards.jade')({
                cards: this.privateCards,
                openCardTemplate: require('./templates/open-card.jade')
        }));
    },
    setPublicCards: function setPublicCards (cards) {
        this.publicCards = cards;
        this.drawPublicCards();
    },
    drawPublicCards: function drawPublicCards () {
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
    },
    onDragEnterCardSlot: function onDragEnterCardSlot (e) {
        this._dragCounter = (this._dragCounter || 0) + 1;
        this.$(e.target).closest('.card-slot').addClass('dragged-over');
    },
    onDragLeaveCardSlot: function onDragLeaveCardSlot (e) {
        this._dragCounter = (this._dragCounter || 1) - 1;
        if (this._dragCounter === 0) {
            this.$(e.target).closest('.card-slot').removeClass('dragged-over');
        }
    },
    onDragOverCardSlot: function onDragOverCardSlot (e) {
        e.preventDefault();
    },
    onDropOverCardSlot: function onDropOverCardSlot(e) {
        var card = JSON.parse(e.dataTransfer.getData("card"));
        var slot = this.$(e.target).closest('.card-slot');
        var rowNumber = slot.data('row-number');
        this.$('.card-slot.dragged-over').removeClass('dragged-over');
        this._dragCounter = 0;

        this.makeMove(card, rowNumber);
    },
    onOpenCardDragStart: function onOpenCardDragStart (e) {
        var card = this.$(e.target).find('.open-card').attr('data-card');
        e.dataTransfer.setData('card', card);
    },
    makeMove: function makeMove (card, rowNumber) {
        serverNotifications.socket.emit('move', {
            gameId: this.gameId,
            playerId: this.playerId,
            move: {
                card: card,
                rowNumber: rowNumber
            }
        });
    }
});

module.exports = PlayGameView;
