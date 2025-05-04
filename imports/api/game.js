import {Log} from 'meteor/logging';
import {Mongo} from 'meteor/mongo';
import {Meteor} from "meteor/meteor";
import {Game} from "../models/game";
import {Player} from "../models/player";

// To be used in client only
export const CurrentGame = new ReactiveVar(undefined);

export const GamesCollection = new Mongo.Collection('games', { transform: doc => Game.createFromDocument(doc) });

Meteor.methods({
    async createGame(player) {
        Log.debug(`Player ${player.username} tries to create a game`);

        let connectedPlayer = await Player.createFromMeteorUser(player);

        let game = await Game.create(connectedPlayer);

        return game.identifier;
    },

    async cancelGame(gameIdentifier, player) {
        Log.debug(`Player ${player.username} tries to cancel game ${gameIdentifier}`);

        let connectedPlayer = await Player.createFromMeteorUser(player);

        let game: Game = await GamesCollection.findOneAsync({ identifier: gameIdentifier });

        if (game === undefined) {
            throw new Meteor.Error('game_not_found', `Game ${gameIdentifier} not found`);
        }

        return game.cancel(connectedPlayer);
    },

    async readyGame(gameIdentifier, player) {
        Log.debug(`Player ${player.username} tries to ready game ${gameIdentifier}`);

        let connectedPlayer = await Player.createFromMeteorUser(player);

        let game: Game = await GamesCollection.findOneAsync({ identifier: gameIdentifier });

        if (game === undefined) {
            throw new Meteor.Error('game_not_found', `Game ${gameIdentifier} not found`);
        }

        return game.playerReady(connectedPlayer);
    },

    async joinGame(gameIdentifier, player) {
        Log.debug(`Player ${player.username} tries to join game ${gameIdentifier}`);

        let connectedPlayer = await Player.createFromMeteorUser(player);

        let game: Game = await GamesCollection.findOneAsync({ identifier: gameIdentifier });

        if (game === undefined) {
            throw new Meteor.Error('game_not_found', `Game ${gameIdentifier} not found`);
        }

        return game.join(connectedPlayer);
    },

    async playerMove(gameIdentifier, player, column) {
        Log.debug(`Player ${player.username} tries to move in game ${gameIdentifier}`);

        let connectedPlayer = await Player.createFromMeteorUser(player);

        let game: Game = await GamesCollection.findOneAsync({ identifier: gameIdentifier });

        if (game === undefined) {
            throw new Meteor.Error('game_not_found', `Game ${gameIdentifier} not found`);
        }

        return game.playerMove(connectedPlayer, column);
    }
});


