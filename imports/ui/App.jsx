import React, {useEffect} from 'react';
import {Meteor} from 'meteor/meteor';
import {Tracker} from 'meteor/tracker';
import {Session} from 'meteor/session';
import {GamesCollection, CurrentGame} from "/imports/api/game";
import {useSubscribe, useTracker, useFind } from 'meteor/react-meteor-data';
import SignIn from './SignIn';
import {Menu} from './Menu';
import Typography from "@mui/material/Typography";
import {GamePage} from "./GamePage";
import {Game, GameState} from "../models/game";

export const App = () => {
    const user = useTracker(() => Meteor.user());
    const games = useSubscribe("gameWithTransform");
    const isInGame = useTracker(() => Session.get('gameCurrentId'));

    // Monitor games activity
    useEffect(() => {
        const computation = Tracker.autorun(async () => {
            const game = await GamesCollection.findOneAsync({ }, { sort: { createdAt: -1 }, transform: (doc) => Game.createFromDocument(doc)});

            if (game && (game.state === GameState.WAITING || game.identifier === Session.get('gameCurrentId'))) {
                console.log('game', game);
                CurrentGame.set(game);
                Session.set('gameCurrentId', game.identifier);
            }
            else {
                console.log('no game');
            }
        }, undefined);

        return () => computation.stop(); // Cleanup when component unmounts
    }, []);

    return (
        <div>
            <Typography
                component="h1"
                variant="h1"
                sx={{width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)'}}
            >
                Puntos
            </Typography>

            {/* "Routing" */}
            <>
                {isInGame !== undefined && <GamePage />}
                {!isInGame && user && <Menu/>}
                {!user && <SignIn/>}
            </>
        </div>
    );
}
