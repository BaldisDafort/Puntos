import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CssBaseline from '@mui/material/CssBaseline';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import JoinGame from './components/JoinGame';
import AppTheme from './theme/AppTheme';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import {useTracker, useFind} from "meteor/react-meteor-data";
import {GamesCollection} from "../api/game";
import {Fragment} from "react";
import {CurrentGame} from "/imports/api/game";
import GameBoard from "/imports/ui/components/GameBoard";
import debounce from 'lodash/debounce';
import {Log} from "meteor/logging";
import {Alert} from "@mui/material";
import {Game, GameState, PlayerState} from "../models/game";
import {Player} from "../models/player";

const Card = styled(MuiCard)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    margin: 'auto',
    [theme.breakpoints.up('sm')]: {
        maxWidth: '450px',
    },
    boxShadow:
        'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
    ...theme.applyStyles('dark', {
        boxShadow:
            'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
    }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
    height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
    minHeight: '100%',
    padding: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
        padding: theme.spacing(4),
    },
    '&::before': {
        content: '""',
        display: 'block',
        position: 'absolute',
        zIndex: -1,
        inset: 0,
        backgroundImage:
            'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
        backgroundRepeat: 'no-repeat',
        ...theme.applyStyles('dark', {
            backgroundImage:
                'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
        }),
    },
}));


const WaitingPlayerCard = ({gameId}) => {

    const onLeaveGame = debounce(async () => {
        await Meteor.callAsync('cancelGame', gameId, Meteor.user());

        CurrentGame.set(undefined);
        Session.set('gameCurrentId', undefined);
    }, 300);

    return (<Card sx={{width: '45%', height: '100%'}}>
            <Typography variant="h5">En attente du second joueur</Typography>
            <Box display="flex" justifyContent="center" marginTop={2}>
                <Button variant="contained" onClick={onLeaveGame}>Quitter la partie</Button>
            </Box>
        </Card>
    );
}

const PlayerCard = ({player, gameId, color}) => {
    const currentUser = Meteor.userId();

    const onReadyClick = debounce(async () => {
        await Meteor.callAsync('readyGame', gameId, Meteor.user());
    }, 300);

    return (<Card sx={{width: '45%', height: '100%'}}>
            <Typography variant="h5">{color} : {player.name}</Typography>
            <>
            {player.state === PlayerState.READY && <Typography variant="h5">Prêt</Typography> }
            {player.state === PlayerState.NOT_READY && currentUser === player.identifier && <Button variant="contained" onClick={onReadyClick}>Prêt</Button>}
            {player.state === PlayerState.NOT_READY && currentUser !== player.identifier && <Typography variant="h5">En attente</Typography>}
            </>
        </Card>
    );
};

const ResultAlert = ({game}) => {
    const status = useTracker(() => {
        if (!game)
            return null;
        return {
            displayAlert: game.state === GameState.FINISHED,
            hasWon: game.hasWon
        };
    }, [game]);

    const exitGame = debounce(() => {
        CurrentGame.set(undefined);
        Session.set('gameCurrentId', undefined);
    });

    return (<>
        {status?.displayAlert && status.hasWon && <Alert severity="success"
                                                         action={<Button color="inherit" size="small"
                                                                         onClick={exitGame}>Quitter</Button>}>Victoire
            !</Alert>}
        {status?.displayAlert && !status.hasWon && <Alert severity="error"
                                                          action={<Button color="inherit" size="small"
                                                                          onClick={exitGame}>Quitter</Button>}>Défaite
            !</Alert>}
    </>)
}

export function GamePage({ disableCustomTheme}) {
    const [open, setOpen] = React.useState(false);

    // const game = useTracker(() => Session.get('gameCurrent'));
    const game = useTracker(() => CurrentGame.get());


    return (
        <AppTheme disableCustomTheme={disableCustomTheme}>
            <CssBaseline enableColorScheme/>
            <SignInContainer direction="column" justifyContent="space-between">
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="left"
                    width="100%"
                    padding={2}
                >
                    <Typography variant="h1">Partie: {game?.identifier}</Typography>
                </Box>

                <ResultAlert game={game}/>
                {/*<ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} />*/}
                <GameBoard game={game}/>

                {/* Players */}
                <Stack
                    direction="row"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="stretch"
                    width="100%"
                    padding={2}
                >
                    <PlayerCard color="Rouge" player={game.players[0]} gameId={game.identifier}/>
                    {game.players.length > 1 && <PlayerCard color="Jaune" player={game.players[1]} gameId={game.identifier}/>}
                    {game.players.length < 2 && <WaitingPlayerCard gameId={game.identifier}/>}
                </Stack>
            </SignInContainer>
        </AppTheme>
    );
}
