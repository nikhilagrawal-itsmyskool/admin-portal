// src/components/shared/confirm-dialog.jsx
import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

const ConfirmDialog = ({ open, onClose, onConfirm, title, content }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{content}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" autoFocus>
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Confirm Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;