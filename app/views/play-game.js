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
        'drop .card-slot': 'onDropOverCardSlot',
        'click .start-button': 'onStartButtonClicked',
        'change #your-name-input': 'onUserNameChanged',
        'change #message-input': 'onMessageInputChanged'
    },
    setup: function playGameViewSetup (gameId, playerId) {
        playerId = playerId || this.playerId;

        if (!playerId) {
            var that = this;
            return $.post('/new-player').then(function (data) {
                return that.setup(gameId, data.id);
            });
        } else {
            gameId =  parseInt(gameId, 10);

            if (gameId === this.gameId && playerId !== this.playerId) {
                this.leaveGame();
            }

            this.gameId = gameId;
            this.playerId = playerId;
            this.url = '#/play/' + this.gameId + '/' + this.playerId;
            history.replaceState(null, null, this.url);

            return q(null);
        }
    },
    onUserNameChanged: function onUserNameChanged (e) {
        var username = this.$(e.target).val();

        if (username) {
            this.username = username;
            serverNotifications.socket.emit('rename', {
                gameId: this.gameId,
                playerId: this.playerId,
                username: this.username
            });
        }
    },
    onMessageInputChanged: function onMessageInputChanged (e) {
        var $target = this.$(e.target);
        var message = $target.val();
        $target.val('');
        serverNotifications.socket.emit('chat message', {
            gameId: this.gameId,
            playerId: this.playerId,
            message: message
        });
    },
    leaveGame: function leaveGame () {
        serverNotifications.socket.emit('leave', {
            gameId: this.gameId,
            playerId: this.playerId
        });
    },
    afterRender: function playGameViewAfterRender () {
        $('.currentGame').html('<a href="' + this.url + '">current game</a>');
        this.renderChat();
        this.setupServerListeners();
        this.joinGame();
    },
    setupServerListeners: function setupServerListeners () {
        var that = this;
        serverNotifications.socket.on('game ' + that.gameId, function (data) {
            if (that.gameId === data.gameId) {
                that.handleMessage(data);
            }
        });
    },
    renderChat: function renderChat () {
        this.$('.chat-container').html(require('./templates/chat.jade')({
            username: this.username || this.playerId
        }));
    },
    renderChatMessage: function renderChatMessage (data) {
        var $messages = this.$('.chat .messages');
        $messages.append(require('./templates/chat-message.jade')(data));
        $messages.scrollTop($messages.get(0).scrollHeight);
    },
    handleMessage: function handleMessage (data) {
        if (data.type === 'publicData') {
            this.reflectPublicData(data);
        } else if (data.type === 'privateData') {
            this.reflectPrivateData(data);
        } else if (data.type === 'mistake') {
            this.splash(data.message);
        }  else if (data.type === 'chat message') {
            this.renderChatMessage(data);
        }
    },
    animateTitle: function animateTitle (message) {
        if (!message) {
            if (this._originialTitle) {
                document.title = this._originialTitle;
                window.clearInterval(this._titleAnimator);
            }
        } else {
            this._originialTitle = document.title;
            var sequence = [message, document.title];
            var pos = 0;
            document.title = message;
            this._titleAnimator = window.setInterval(function () {
                document.title = sequence[pos];
                pos = (pos + 1) % sequence.length;
            }, 1000);
        }
    },
    reflectPublicData: function reflectPublicData (data) {
        var drawPublicCards = this.drawPublicCards.bind(this, data.publicCards);

        if (data.animatePublicCards) {
            this.$('.public-card-container[data-row-number="' + data.animatePublicCards.takeRow + '"]')
                .css('opacity', 0)
                .bind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', drawPublicCards);
        } else {
            drawPublicCards();
        }

        this.drawPlayers(data.players);

        var myTurn = (data.nextPlayerToPlayId === this.playerId && data.status === 'playing');

        if (myTurn) {
            this.$('.my-turn').css('visibility', 'visible');
            this.animateTitle('(*) Vachette');
        } else {
            this.$('.my-turn').css('visibility', 'hidden');
            this.animateTitle(false);
        }

        var statusString = data.statusString;

        if (data.status === 'waiting' || data.status === 'confirming') {
            var joinURL = location.protocol + '//' + location.host + '/#/play/' + this.gameId;
            statusString += ' Invite ppl with this URL: ' +
                            '<input type="text" size="' + joinURL.length +
                            '" disabled="true" value="' + joinURL + '">';
        }

        this.$('.status').html(statusString);

        var startButtonState = null;

        if (data.status === 'confirming') {
            if (data.started[this.playerId]) {
                startButtonState = 'clicked';
            } else {
                startButtonState = 'start';
            }
        } else if (data.status === 'waiting') {
            startButtonState = 'start';
        } else if (data.status === 'playing') {
            this.$('.rules').hide();
        }

        this.$('.start-button-area').html(require('./templates/start-button.jade')({
            state: startButtonState
        }));
    },
    reflectPrivateData: function reflectPrivateData (data) {
        this.drawPrivateCards(data.privateCards);
    },
    joinGame: function joinGame () {
        serverNotifications.socket.emit('join', {
            gameId: this.gameId,
            playerId: this.playerId,
            username: this.username || this.playerId
        });
    },
    splash: function splash (message, type) {

        type = type || 'error';

        this.consecutiveErrorCount = (this.consecutiveErrorCount || 0) + 1;

        if (this.consecutiveErrorCount >= 3) {
            message = 'Are you dumb?';
            this.consecutiveErrorCount = 0;
        }

        this.$('.splash-message').html(message);

        var elem = this.$('.splash')
        .addClass('fade')
        .width(this.$('.public-area').width())
        .height(this.$('.public-area').height())
        .css('visibility', 'visible')
        .css('opacity', 0)
        .bind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function () {
            elem.css('visibility', 'hidden').css('opacity', 1);
        });
    },
    drawPrivateCards: function drawPrivateCards (cards) {
        this.$('.hand-of-cards').html(
            require('./templates/hand-of-cards.jade')({
                cards: cards,
                openCardTemplate: require('./templates/open-card.jade')
        }));
    },
    drawPublicCards: function drawPublicCards (cards) {
        var cardsForTemplate = _.map(cards, function (row) {
            return {
                cards: row,
            };
        });

        this.$('.public-cards').html(
            require('./templates/public-cards.jade')({
                rows: cardsForTemplate,
                openCardTemplate: require('./templates/open-card.jade')
        }));
    },
    drawPlayers: function drawPlayers (players) {
        this.$('.players').html(require('./templates/players.jade')({
            players: players
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
    },
    onStartButtonClicked: function onStartButtonClicked () {
        serverNotifications.socket.emit('start', {
            gameId: this.gameId,
            playerId: this.playerId
        });
    }
});

module.exports = PlayGameView;
