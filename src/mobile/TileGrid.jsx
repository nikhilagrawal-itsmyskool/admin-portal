import React from "react";
import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { ChevronRight as ChevronRightIcon } from "@mui/icons-material";

// The mobile tile grid, shared by the home bands and the hub screens. Each tile shows an
// icon + label; a `hub` tile (count set) gets a ›-affordance hinting it opens a sub-menu.
export default function TileGrid({ tiles, onOpen }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 1.5,
      }}
    >
      {tiles.map((t) => {
        const Icon = t.icon;
        const isHub = t.kind === "hub";
        const color = t.color || "#3366ff";
        return (
          <Card key={t.id ?? t.path} variant="outlined">
            <CardActionArea onClick={() => onOpen(t)}>
              <CardContent
                sx={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  py: 2.5,
                  textAlign: "center",
                }}
              >
                {isHub && (
                  <ChevronRightIcon
                    sx={{ position: "absolute", top: 6, right: 6, fontSize: 18, color: "text.disabled" }}
                  />
                )}
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: 2,
                    backgroundColor: `${color}1f`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon sx={{ fontSize: 26, color }} />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t.title}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        );
      })}
    </Box>
  );
}
