import React, {useState} from 'react';
import {Meteor} from 'meteor/meteor';
import {Box, Grid, Button, Stack} from '@mui/material';
import {useTracker} from "meteor/react-meteor-data";
import {Log} from "meteor/logging";
import debounce from "lodash/debounce";

import {GameState} from "../../models/game";

const COLS = 7;

const ColumnsHeader = ({game}) => {
    // Handle dropping a token
    const handleColumnClick = debounce((col) => {
        Meteor.callAsync('playerMove', game.identifier, Meteor.user(), col);
    }, 300);

    if (game.disableActions) return (<Stack direction="row" spacing={1} justifyContent="center" paddingX={2}>
        {Array.from({length: COLS}).map((_, col) => String.fromCharCode(65 + col)).map(col => (
            <Box key={col} width={65}>
            <h3>{col}</h3>
            </Box>))}
    </Stack>);
    return (<Stack direction="row" spacing={1} justifyContent="center" padding={2}>
        {Array.from({length: COLS}).map((_, col) => String.fromCharCode(65 + col)).map(col => (
            <Button key={col} width={65} disabled={game.disableActions} variant="contained"
                    onClick={() => handleColumnClick(col)}>{col}</Button>))}
    </Stack>);
};

export default function GameBoard({game}) {
    const gameTransformed = useTracker(() => {
        if (!game)
            return null;
        Log.info(game);
        return {
            identifier: game.identifier,
            state: game.state,
            turn: String(game.turn).padStart(2, '0'),
            playerTurn: game.players[game.turn % 2]?.name,
            disableActions: !!!game.isPlayerTurn || game.state !== GameState.PLAYING,
            board: game.gameBoard//;[0].map((_, colIndex) => game.gameBoard.map(row => row[colIndex]))
        };
    }, [game]);

    return (
        <Box sx={{width: '100%', margin: 'auto', textAlign: 'center'}}>
            {gameTransformed?.state === GameState.WAITING && <h2>En attente des joueurs</h2>}
            {gameTransformed?.state === GameState.PLAYING && <h2>Tour {gameTransformed.turn}</h2>}
            {gameTransformed?.state === GameState.PLAYING && <h2>Au tour de {gameTransformed.playerTurn?.toUpperCase()}</h2>}

            {/* Column Selection Buttons */}
            <ColumnsHeader game={gameTransformed} />

            {/* Game Board */}
            <Stack direction="row" justifyContent="center" spacing={1}
                   sx={{marginTop: 2, border: '2px solid #000', padding: 2}}>
                {Array.from({length: COLS}).map((_, colIndex) => (
                    <Stack key={colIndex} direction="column" spacing={1}>
                        {gameTransformed.board.map((row, rowIndex) => (
                            <Box
                                key={`${rowIndex}-${colIndex}`}
                                sx={{
                                    width: 65, height: 65, borderRadius: '50%',
                                    backgroundColor: gameTransformed.board[rowIndex][colIndex] ? (gameTransformed.board[rowIndex][colIndex] === 1 ? 'red' : 'yellow') : 'white',
                                    border: '2px solid black',
                                }}
                            />
                        ))}
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
}
