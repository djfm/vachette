/* global describe, it, beforeEach */
var chai = require('chai');
chai.should();

var Game = require('../app/game');

describe('The Game', function () {

    var game;

    beforeEach(function () {
        game = new Game();
        game.playing = true;
    });

    it('should allow legal moves that do not make the player take cards', function () {
        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}]
        ];

        game.addPlayer('alice', {
            cards: [
                {number: 5}
            ]
        });

        game.computeMove('alice', {
            rowNumber: 3,
            card: {number: 5}
        }).should.deep.equal({
            ok: true,
            take: [],
            publicCards: [
                [{number: 15}],
                [{number: 2}],
                [{number: 3}],
                [{number: 4}, {number: 5}]
            ],
            privateCards: []
        });
    });

    it('should forbid dropping a card on a card that is too high', function () {
        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}]
        ];

        game.addPlayer('alice', {
            cards: [{number: 5}]
        });

        game.computeMove('alice', {
            rowNumber: 0,
            card: {number: 5}
        }).ok.should.equal(false);
    });

    it('should forbid dropping a card on a card that is too low', function () {
        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}]
        ];

        game.addPlayer('alice', {
            cards: [{number: 5}]
        });

        game.computeMove('alice', {
            rowNumber: 0,
            card: {number: 5}
        }).ok.should.equal(false);
    });

    it('should allow taking a row by dropping a card that is lower than any other top level card', function () {
        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}]
        ];

        game.addPlayer('alice', {
            cards: [{number: 1}]
        });

        game.computeMove('alice', {
            rowNumber: 2,
            card: {number: 1}
        }).should.deep.equal({
            ok: true,
            take: [{number: 3}],
            publicCards: [
                [{number: 15}],
                [{number: 2}],
                [{number: 1}],
                [{number: 4}]
            ],
            privateCards: []
        });
    });

    it('should make the player take the row when he drops the last card', function () {
        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}, {number: 5}, {number: 6}, {number: 7}, {number: 8}]
        ];

        game.addPlayer('alice', {
            cards: [{number: 9}]
        });

        game.computeMove('alice', {
            rowNumber: 3,
            card: {number: 9}
        }).should.deep.equal({
            ok: true,
            take: [{number: 4}, {number: 5}, {number: 6}, {number: 7}, {number: 8}],
            publicCards: [
                [{number: 15}],
                [{number: 2}],
                [{number: 3}],
                [{number: 9}]
            ],
            privateCards: []
        });
    });

    it('should forbid a player from playing a card he doesn\'t have', function () {
        game.publicCards = [
            [{number: 15}],
            [{number: 2}],
            [{number: 3}],
            [{number: 4}]
        ];

        game.addPlayer('alice', {
            cards: [{number: 9}]
        });

        game.computeMove('alice', {
            rowNumber: 3,
            card: {number: 10}
        }).ok.should.equal(false);
    });

    it('should forbid a player from playing when it is not their turn', function () {
        game.addPlayer('alice');

        game.addPlayer('bob');

        game.computeMove('bob').should.deep.equal({
            ok: false,
            message: 'Not your turn!'
        });
    });

    it('should retrieve the public info on players', function () {
        game.addPlayer('alice', {
            cards: [{number: 1}],
            ate: []
        });
        game.addPlayer('bob', {
            ate: [{number: 1, vachettes: 5}, {number: 2, vachettes: 1}]
        });

        game.getPlayersPublicInformation().should.deep.equal([
            {
                name: 'alice',
                theirTurn: true,
                cowsEaten: 0
            },
            {
                name: 'bob',
                theirTurn: false,
                cowsEaten: 6
            }
        ]);
    });

    it('should not allow a move if game is not started', function () {
        game.playing = false;
        game.addPlayer('alice', {
            cards: [{number: 1}],
            ate: []
        });
        game.computeMove('alice').should.deep.equal({
            ok: false,
            message: 'Game has not started yet!'
        });
    });
});
