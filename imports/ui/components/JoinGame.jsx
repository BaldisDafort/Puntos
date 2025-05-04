import * as React from 'react';
import {Meteor} from 'meteor/meteor';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import OutlinedInput from '@mui/material/OutlinedInput';

interface JoinGameProps {
    open: boolean;
    handleClose: () => void;
}

export default function JoinGame({ open, handleClose }: JoinGameProps) {
    return (
        <Dialog
            open={open}
            onClose={handleClose}
            slotProps={{
                paper: {
                    component: 'form',
                    onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        handleClose();

                        const formData = new FormData(event.currentTarget);
                        let code = formData.get('code');

                        await Meteor.callAsync("joinGame", code.toUpperCase(), Meteor.user());
                    },
                    sx: { backgroundImage: 'none' },
                },
            }}
        >
            <DialogTitle>Rejoindre une partie</DialogTitle>
            <DialogContent
                sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}
            >
                <DialogContentText>
                    Entrez le code de la partie que vous souhaitez rejoindre
                </DialogContentText>
                <OutlinedInput
                    autoFocus
                    required
                    margin="dense"
                    id="code"
                    name="code"
                    label="Code"
                    placeholder="Code"
                    type="text"
                    fullWidth
                />
            </DialogContent>
            <DialogActions sx={{ pb: 3, px: 3 }}>
                <Button onClick={handleClose}>Annuler</Button>
                <Button variant="contained" type="submit">
                    Rejoindre
                </Button>
            </DialogActions>
        </Dialog>
    );
}
