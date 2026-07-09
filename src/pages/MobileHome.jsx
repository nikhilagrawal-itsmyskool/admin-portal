import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
} from "@mui/material";
import { useCan } from "../permissions/can";
import { MOBILE_FEATURES } from "../mobile/mobileFeatures";

// Mobile landing: a tile menu of the mobile-published features the signed-in user's
// role can access. Rendered at "/" on small screens (see App.jsx HomeScreen).
export default function MobileHome() {
  const navigate = useNavigate();
  const can = useCan();
  const items = MOBILE_FEATURES.filter((f) => !f.perm || can(f.perm));

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        ItsMySkool
      </Typography>
      {items.length === 0 ? (
        <Typography color="text.secondary">
          No mobile features are available for your role. Use a desktop for the full
          portal.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 1.5,
          }}
        >
          {items.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.path} variant="outlined">
                <CardActionArea onClick={() => navigate(f.path)}>
                  <CardContent
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                      py: 2.5,
                      textAlign: "center",
                    }}
                  >
                    <Icon sx={{ fontSize: 32, color: "#3366ff" }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {f.title}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
