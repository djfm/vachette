var View    = require('./view'),
    $       = require('jquery')
;

var NewGameView = View.extend({
    template: require('./templates/new-game.jade'),
    events: {
        'click .new-game': 'newGame'
    },
    newGame: function newGame () {
        $.post('/new-game').then(function (data) {
            window.location.hash = '/play/' + data.id;
        });
    }
});

module.exports = NewGameView;
