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
    onDragOverCardSlot: function onDragOverCardSlot (e) {
        e.preventDefault();
    },
    onDropOverCardSlot: function onDropOverCardSlot(e) {
        var card = JSON.parse(e.dataTransfer.getData("card"));
        var rowNumber = this.$(e.target).closest('.card-slot').data('row-number');
        var that = this;
        this.checkIfMoveIsAllowed(card, rowNumber).then(function (yes) {
            if (yes) {
                that.makeMove(card, rowNumber);
            }
        });
    },
    onOpenCardDragStart: function onOpenCardDragStart (e) {
        var card = this.$(e.target).find('.open-card').attr('data-card');
        e.dataTransfer.setData('card', card);
    },
    checkIfMoveIsAllowed: function checkIfMoveIsAllowed (card, rowNumber) {
        return q(true);
    },
    makeMove: function makeMove (card, rowNumber) {
        this.publicCards[rowNumber].push(card);
        this.privateCards = _.reject(this.privateCards, function (c) {
            return c.number === card.number;
        });

        this.drawPublicCards();
        this.drawPrivateCards();
    }
});

module.exports = PlayGameView;
