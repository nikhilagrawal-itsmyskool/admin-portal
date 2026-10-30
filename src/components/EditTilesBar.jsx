import React from "react";
import { Box, Button, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

// Sticky toolbar shown while tiles are in edit mode: a hint, a "Reset" to restore the default
// layout (un-hide everything + clear the custom order), and "Done" to leave edit mode.
export default function EditTilesBar({ onReset, onDone, canReset }) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        mb: 2,
        px: 1.5,
        py: 1,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        gap: 1,
        bgcolor: "rgba(51,102,255,0.1)",
        border: "1px solid rgba(51,102,255,0.28)",
        backdropFilter: "blur(6px)",
      }}
    >
      <Typography sx={{ flex: 1, fontSize: 12.5, color: "#274bdb", fontWeight: 600 }}>
        Drag to rearrange · tap ✕ to hide
      </Typography>
      <Button
        size="small"
        startIcon={<RestartAltIcon />}
        onClick={onReset}
        disabled={!canReset}
        sx={{ textTransform: "none" }}
      >
        Reset
      </Button>
      <Button
        size="small"
        variant="contained"
        startIcon={<CheckIcon />}
        onClick={onDone}
        sx={{ textTransform: "none" }}
      >
        Done
      </Button>
    </Box>
  );
}
