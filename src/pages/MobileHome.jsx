import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { buildMobileTiles } from "../mobile/mobileFeatures";
import { useMobileVisibility } from "../mobile/useMobileVisibility";
import TileGrid from "../mobile/TileGrid";
import InstallButton from "../components/InstallButton";

// Mobile landing: the role's mobile features, organised into a pinned "Today" band and
// grouped module hubs (see buildMobileTiles). Rendered at "/" on small screens
// (App.jsx HomeScreen). Tiles either navigate straight to a page or open a hub screen.
export default function MobileHome() {
  const navigate = useNavigate();
  const { visible } = useMobileVisibility();
  const sections = buildMobileTiles(visible);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        ItsMySkool
      </Typography>
      <InstallButton variant="contained" fullWidth sx={{ mb: 2 }} />
      {sections.length === 0 ? (
        <Typography color="text.secondary">
          No mobile features are available for your role. Use a desktop for the full
          portal.
        </Typography>
      ) : (
        sections.map((sec) => (
          <Box key={sec.key} sx={{ mb: 3 }}>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 800,
                letterSpacing: 0.9,
                display: "block",
                mb: 1.25,
                pb: 0.75,
                borderBottom: "1px solid rgba(34,43,69,0.09)",
              }}
            >
              {sec.label}
            </Typography>
            {sec.tiles.length > 0 && <TileGrid tiles={sec.tiles} onOpen={(t) => navigate(t.path)} />}
            {sec.groups.map((g) => (
              <Box key={g.label} sx={{ mt: 2, pl: 1.5, borderLeft: "2px solid rgba(51,102,255,0.22)" }}>
                <Typography
                  sx={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.9,
                    textTransform: "uppercase",
                    color: "rgba(51,102,255,0.78)",
                    mb: 1,
                  }}
                >
                  {g.label}
                </Typography>
                <TileGrid tiles={g.tiles} onOpen={(t) => navigate(t.path)} />
              </Box>
            ))}
          </Box>
        ))
      )}
    </Box>
  );
}
