import {Meteor} from "meteor/meteor";
import {Log} from "meteor/logging";
import {Random} from "meteor/random";
import {GamesCollection} from "../api/game";
import {Player} from "./player";

export const GameState = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    FINISHED: 'finished'
}
export const PlayerState = {
    NOT_READY: 'not_ready',
    READY: 'ready',
    IN_GAME: 'in_game',
    FINISHED: 'finished'
}

export class Game {

    identifier: string;
    createdAt: Date;
    startedAt: Date;
    finishedAt: Date;
    players: [{ identifier: string, name: string, state: string }];
    state: string;
    turn: number;
    winner: Player;
    gameBoard: [[number], [number], [number], [number], [number], [number], [number]]; // number is player's index in 'players'

    /**
     * Get game duration
     * @returns {number}
     */
    get gameDurationInMilliseconds() {
        return this.finishedAt - this.createdAt;
    }

    get hasWon() {
        return this.state === GameState.FINISHED && this.winner.identifier === Meteor.userId();
    }

    get isTie() {
        return this.state === GameState.FINISHED && this.winner === undefined;
    }

    get isPlayer1() {
        let isPlayer1 = this.players[0].identifier === Meteor.userId();
        Log.debug('isPlayer1', isPlayer1);
        return isPlayer1;
    }

    get isPlayer2() {
        return this.players[1].identifier === Meteor.userId();
    }

    get isPlayerTurn() {
        return this.isPlayer1 ? this.turn % 2 === 0 : this.turn % 2 === 1;
    }

    // TODO:
    constructor() {
    }

    static createFromDocument(document) {
        let game = new Game();

        Object.assign(game, document);

        // game.identifier = document.identifier;
        // game.createdAt = document.createdAt;
        // game.startedAt = document.startedAt;
        // game.finishedAt = document.finishedAt;
        // game.players = document.players;
        // game.state = document.state;
        // game.turn = document.turn;
        // game.winner = document.winner;
        // game.gameBoard = document.gameBoard;

        return game;
    }

    /**
     * Create new game
     * @param player
     * @returns {Game}
     */
    static async create(player: Player) {
        let playerLite = {identifier: player.identifier, name: player.name, state: PlayerState.NOT_READY};
        let game = new Game();

        game.identifier = Random.id(6).toUpperCase();
        game.createdAt = Date.now();
        game.players = [playerLite];
        game.state = GameState.WAITING;
        game.turn = 0;
        game.gameBoard = new Array(6).fill(new Array(7).fill(0));

        Log.info(`Player ${player.name} created game ${game.identifier}`);

        // Insert game in DB
        await GamesCollection.insertAsync(game);

        return game;
    }

    async cancel(player: Player) {
        Log.info(`Player ${player.name} cancelled game ${this.identifier}`);

        await GamesCollection.removeAsync({identifier: this.identifier});
    }

    /**
     * Join game
     * @param player
     * @returns {boolean}
     */
    async join(player: Player) {
        let playerLite = {identifier: player.identifier, name: player.name, state: PlayerState.NOT_READY};

        // If game is waiting
        if (this.state === GameState.WAITING) {

            // Check that players count is exactly 1
            if (this.players.length !== 1) {
                Log.info(`Player ${player.name} could not join game ${this.identifier}, game currently have ${this.players.length} players`);
                return false;
            }

            // Check if player already joined
            if (this.players.find(p => p.identifier === player.identifier)) {
                Log.info(`Player ${player.name} already joined game ${this.identifier}`);
                return false;
            }

            // Player can join
            this.players.push(playerLite);
            Log.info(`Player ${player.name} joined game ${this.identifier}`);

            // Update game in DB
            await GamesCollection.updateAsync({identifier: this.identifier}, {$set: {players: this.players}});

            return true;
        }

        Log.info(`Player ${player.name} could not join game ${this.identifier}, game is ${this.state}`);
        return false;
    }

    /**
     * Set player ready in game
     * @param player
     * @returns {boolean}
     */
    async playerReady(player: Player) {
        let playerInGame = this.players.find(p => p.identifier === player.identifier);

        if (playerInGame) {
            playerInGame.state = PlayerState.READY;
            Log.info(`Player ${player.name} is ready in game ${this.identifier}`);

            this.#checkStateForAutoLaunch();

            // Update game in DB
            await GamesCollection.updateAsync({identifier: this.identifier}, {
                $set:
                    {
                        state: this.state,
                        startedAt: this.startedAt,
                        players: this.players
                    }
            });

            return true;
        }

        Log.info(`Player ${player.name} is not in game ${this.identifier}`);

        return false;
    }

    /**
     * Place a token for specified player in the specified column
     * @param player
     * @param column
     * @returns {boolean}
     */
    async playerMove(player: Player, column: string) {
        const columns = {
            "A": 0,
            "B": 1,
            "C": 2,
            "D": 3,
            "E": 4,
            "F": 5,
            "G": 6
        };

        // Check if game is playing
        if (this.state !== GameState.PLAYING) {
            Log.info(`Player ${player.name} played in game ${this.identifier} but game is ${this.state}`);
            return false;
        }

        let columnIndex = columns[column.toUpperCase()];

        // Check the validity of the column played by the player
        if (columnIndex === undefined) {
            Log.info(`Player ${player.name} played an invalid column (${column}) in game ${this.identifier}`);
            return false;
        }

        let playerIndex = this.players.findIndex(p => p.identifier === player.identifier);
        let playerIdInGame = playerIndex + 1;

        if (playerIndex === -1) {
            Log.error(`Player ${player.name} is not in game ${this.identifier}`);
            return false;
        }

        // Place token in the first available slot in the column starting from the bottom
        for (let row = 5; row >= 0; row--) {
            let cell = this.gameBoard[row][columnIndex];

            if (cell > 0)
                continue;

            this.gameBoard[row][columnIndex] = playerIdInGame;
            Log.debug(`Player ${player.name} played in game ${this.identifier} in column ${columnIndex} at row ${row}`);

            if (!this.#checkForWinner() && !this.#checkForTie()) {
                this.turn++;
            }

            // Update game in DB
            await GamesCollection.updateAsync({identifier: this.identifier}, {
                $set:
                    {
                        state: this.state,
                        finishedAt: this.finishedAt,
                        winner: this.winner,
                        players: this.players,
                        gameBoard: this.gameBoard,
                        turn: this.turn
                    }
            });

            return true;
        }

        Log.info(`Player ${player.name} could not play in game ${this.identifier} in column ${columnIndex}, the column is full`);
        return false;
    }

    /**
     * Check if all cells are full
     * @returns {boolean}
     */
    #checkForTie() {
        let boardIsFull = this.gameBoard.every(row => row.every(cell => cell > 0));

        if (boardIsFull) {
            this.state = GameState.FINISHED;
            this.finishedAt = Date.now();
            this.players.forEach(p => p.state = PlayerState.FINISHED);
            Log.info(`Game ${this.identifier} is full`);
        }
        return boardIsFull;
    }

    /**
     * Check if game has a winner
     * @returns {boolean}
     */
    #checkForWinner() {

        /**
         * Check if the tokens in the cells are from the same player (if any)
         * @param cellA
         * @param cellB
         * @param cellC
         * @param cellD
         * @returns {boolean} if all cells contains a token from the same player
         */
        function checkForLineInCells(cellA, cellB, cellC, cellD) {
            // Check first cell non-zero and all cells match
            return ((cellA !== 0) && (cellA === cellB) && (cellA === cellC) && (cellA === cellD));
        }

        /**
         * Check if a player managed to form a line of 4 tokens
         * @param gameBoard
         * @returns {number|*} the player's index who managed to form a line if any, -1 otherwise
         */
        function checkForLineInGameboard(gameBoard) {
            // Check for vertical line
            for (let row = 0; row < 3; row++)
                for (let column = 0; column < 7; column++)
                    if (checkForLineInCells(gameBoard[row][column], gameBoard[row + 1][column], gameBoard[row + 2][column], gameBoard[row + 3][column]))
                        return gameBoard[row][column] - 1;

            // Check for horizontal line
            for (let row = 0; row < 6; row++)
                for (let column = 0; column < 4; column++)
                    if (checkForLineInCells(gameBoard[row][column], gameBoard[row][column + 1], gameBoard[row][column + 2], gameBoard[row][column + 3]))
                        return gameBoard[row][column] - 1;

            // Check for diagonal line down-right
            for (let row = 0; row < 3; row++)
                for (let column = 0; column < 4; column++)
                    if (checkForLineInCells(gameBoard[row][column], gameBoard[row + 1][column + 1], gameBoard[row + 2][column + 2], gameBoard[row + 3][column + 3]))
                        return gameBoard[row][column] - 1;

            // Check for diagonal line down-left
            for (let row = 3; row < 6; row++)
                for (let column = 0; column < 4; column++)
                    if (checkForLineInCells(gameBoard[row][column], gameBoard[row - 1][column + 1], gameBoard[row - 2][column + 2], gameBoard[row - 3][column + 3]))
                        return gameBoard[row][column] - 1;

            return -1;
        }

        let gameBoard = this.gameBoard;

        if (gameBoard.length < 6 || !gameBoard.every(row => row.length === 7)) {
            Log.error(`Game board is invalid`, gameBoard);
            return false;
        }

        let playerIndex = checkForLineInGameboard(gameBoard);

        if (playerIndex === -1) {
            return false;
        }

        let player = this.players[playerIndex];

        this.state = GameState.FINISHED;
        this.finishedAt = Date.now();
        this.players.forEach(p => p.state = PlayerState.FINISHED);
        this.winner = player;

        Log.info(`Player ${player.name} won in game ${this.identifier}`);

        return true;
    }

    /**
     * Check if game can start
     */
    #checkStateForAutoLaunch() {
        // Check that players count is exactly 2
        if (this.players.length !== 2) {
            return false;
        }

        // Check that all players are ready
        if (this.players.every(p => p.state === PlayerState.READY)) {
            this.state = GameState.PLAYING;
            this.startedAt = Date.now();
            this.players.forEach(p => p.state = PlayerState.IN_GAME);

            this.#shufflePlayers();

            Log.info(`Game ${this.identifier} started`);
            return true;
        }

        return false;
    }

    #shufflePlayers() {
        let i = this.players.length, j, temp;
        while (--i > 0) {
            j = Math.floor(Math.random() * (i + 1));
            temp = this.players[i];
            this.players[i] = this.players[j];
            this.players[j] = temp;
        }
    }
}