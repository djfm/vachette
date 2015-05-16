/* global describe, it */
var chai = require('chai');
chai.should();

var gameLib = require('../app/game');

describe('The Game', function () {
    it('should allow legal moves that do not make the player take cards', function () {
        var game = new gameLib.Game();

        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}]
        ];

        game.players = {
            alice: {
                cards: [
                    {number: 5}
                ]
            }
        };

        game.tryMove('alice', {
            rowNumber: 3,
            card: {number: 5}
        }).should.deep.equal({
            ok: true,
            player: {cards: [], ate: []},
            publicCards: [
                [{number: 15}],
                [{number: 2}],
                [{number: 3}],
                [{number: 4}, {number: 5}]
            ]
        });
    });

    it('should forbid dropping a card on a card that is too high', function () {
        var game = new gameLib.Game();

        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}]
        ];

        game.players = {
            alice: {
                cards: [
                    {number: 5}
                ]
            }
        };

        game.tryMove('alice', {
            rowNumber: 0,
            card: {number: 5}
        }).should.deep.equal({
            ok: false,
            player: {cards: [{number: 5}], ate: []},
            publicCards: [
                [{number: 15}],
                [{number: 2}],
                [{number: 3}],
                [{number: 4}]
            ]
        });
    });

    it('should forbid dropping a card on a card that is too low', function () {
        var game = new gameLib.Game();

        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}]
        ];

        game.players = {
            alice: {
                cards: [
                    {number: 5}
                ]
            }
        };

        game.tryMove('alice', {
            rowNumber: 2,
            card: {number: 5}
        }).should.deep.equal({
            ok: false,
            player: {cards: [{number: 5}], ate: []},
            publicCards: [
                [{number: 15}],
                [{number: 2}],
                [{number: 3}],
                [{number: 4}]
            ]
        });
    });

    it('should allow taking a row by dropping a card that is lower than any other top level card', function () {
        var game = new gameLib.Game();

        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}]
        ];

        game.players = {
            alice: {
                cards: [
                    {number: 1}
                ]
            }
        };

        game.tryMove('alice', {
            rowNumber: 2,
            card: {number: 1}
        }).should.deep.equal({
            ok: true,
            player: {cards: [], ate: [{number: 3}]},
            publicCards: [
                [{number: 15}],
                [{number: 2}],
                [{number: 1}],
                [{number: 4}]
            ]
        });
    });

    it('should make the player take the row when he drops the last card', function () {
        var game = new gameLib.Game();

        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}, {number: 5}, {number: 6}, {number: 7}, {number: 8}]
        ];

        game.players = {
            alice: {
                cards: [
                    {number: 9}
                ]
            }
        };

        game.tryMove('alice', {
            rowNumber: 3,
            card: {number: 9}
        }).should.deep.equal({
            ok: true,
            player: {cards: [], ate: [{number: 4}, {number: 5}, {number: 6}, {number: 7}, {number: 8}]},
            publicCards: [
                [{number: 15}],
                [{number: 2}],
                [{number: 3}],
                [{number: 9}]
            ]
        });
    });

    it('should forbid a player from playing a card he doesn\'t have', function () {
        var game = new gameLib.Game();

        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}]
        ];

        game.players = {
            alice: {
                cards: [
                    {number: 9}
                ]
            }
        };

        game.tryMove('alice', {
            rowNumber: 3,
            card: {number: 10}
        }).should.deep.equal({
            ok: false,
            player: {cards: [{number: 9}], ate: []},
            publicCards: [
                [{number: 15}],
                [{number: 2}],
                [{number: 3}],
                [{number: 4}]
            ]
        });
    });
});
