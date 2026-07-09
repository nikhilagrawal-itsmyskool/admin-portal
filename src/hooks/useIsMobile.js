import { useMediaQuery, useTheme } from "@mui/material";

// The mobile (restricted) surface applies below the `sm` breakpoint (< 600px) — phones
// only. Tablets (sm and up) get the full desktop portal. This aligns with ResponsiveDataGrid
// (cards < sm) and the action-gating sx. The drawer layout still switches at `md` in
// MainLayout (permanent sidebar >= md, hamburger drawer below).
export function useIsMobile() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("sm"));
}
