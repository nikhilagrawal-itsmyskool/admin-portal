import React from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Box, Typography, IconButton, Stack } from "@mui/material";
import { ArrowBack as BackIcon } from "@mui/icons-material";
import { getHub, hubChildren } from "../mobile/mobileFeatures";
import { useMobileVisibility } from "../mobile/useMobileVisibility";
import TileGrid from "../mobile/TileGrid";

// A module hub's little home: the actions inside a hub tile (e.g. Sports → Items ·
// Issues), filtered to what the signed-in user may do. Reached at /hub/:key from the
// mobile home. If the hub is unknown or the user has no visible actions, bounce home.
export default function HubPage() {
  const { key } = useParams();
  const navigate = useNavigate();
  const { visible } = useMobileVisibility();

  const hub = getHub(key);
  if (!hub) return <Navigate to="/" replace />;

  const kids = hubChildren(key, visible).map((f) => ({
    kind: "link",
    id: f.path,
    title: f.hubLabel || f.title,
    icon: f.icon,
    path: f.path,
    color: hub.color, // the actions inside a hub share the module accent
  }));

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton size="small" edge="start" onClick={() => navigate("/")} aria-label="Back">
          <BackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {hub.title}
        </Typography>
      </Stack>
      {kids.length === 0 ? (
        <Typography color="text.secondary">Nothing here for your role.</Typography>
      ) : (
        <TileGrid tiles={kids} onOpen={(t) => navigate(t.path)} />
      )}
    </Box>
  );
}
