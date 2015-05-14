var $               = require('jquery'),
    q               = require('q'),
    Backbone        = require('backbone'),
    layout          = require('./views/templates/layout.jade'),
    NewGameView     = require('./views/new-game'),
    PlayGameView    = require('./views/play-game')
;

$('body').html(layout());

var Router = Backbone.Router.extend({
    routes: {
        '': 'newGame',
        'play/:gameId(/:playerId)': 'playGame'
    },
    views: {
        // will hold mounted views when routes are accessed
        // so that we instanciate them only once
    },
    mount: function mount (name, Constructor, beforeRender) {
        if (!this.views[name]) {
            this.views[name] = new Constructor({
                el: $('#main-view')
            });
        }

        var setup;

        if (beforeRender) {
            setup = beforeRender(this.views[name]);
        } else {
            setup = q(null);
        }

        var router = this;

        return setup.then(function () {
            return router.views[name].render();
        });
    },
    newGame: function newGameRoute () {
        this.mount('newGame', NewGameView);
    },
    playGame: function playGameRoute (gameId, playerId) {
        this.mount('playGame', PlayGameView, function (gameView) {
            return gameView.setup(gameId, playerId);
        });
    }
});

new Router();

Backbone.history.start();
