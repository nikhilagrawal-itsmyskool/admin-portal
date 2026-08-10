import React, { useState } from 'react';
import { IconButton, Button, Menu, MenuItem, Tooltip, ListItemText } from '@mui/material';
import { Print as PrintIcon, ArrowDropDown as ArrowIcon } from '@mui/icons-material';
import { openReceipt } from './feesUi';

// Print a receipt, with a quiet ▾ that offers the "Statement view" (SchoolPad-style waterfall).
// Default click prints the normal receipt; the arrow is deliberately low-key.
export default function ReceiptPrintButton({ receiptId, variant = 'text', size = 'small' }) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);
  return (
    <>
      {variant === 'icon'
        ? <Tooltip title="Print"><IconButton size={size} onClick={() => openReceipt(receiptId)}><PrintIcon fontSize="small" /></IconButton></Tooltip>
        : <Button size={size} onClick={() => openReceipt(receiptId)} sx={{ minWidth: 0, pr: 0.5 }}>Print</Button>}
      <Tooltip title="Print options">
        <IconButton size={size} onClick={(e) => setAnchor(e.currentTarget)} sx={{ ml: -0.5, p: 0.25 }}><ArrowIcon fontSize="small" /></IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        <MenuItem onClick={() => { close(); openReceipt(receiptId); }}><ListItemText primary="Print receipt" secondary="Standard" /></MenuItem>
        <MenuItem onClick={() => { close(); openReceipt(receiptId, 'waterfall'); }}><ListItemText primary="Statement view" secondary="SchoolPad-style running statement" /></MenuItem>
      </Menu>
    </>
  );
}
