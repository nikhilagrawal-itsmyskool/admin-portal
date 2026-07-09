import { useMediaQuery, useTheme } from "@mui/material";

// The mobile (restricted) surface applies below the `md` breakpoint — the inverse of
// MainLayout's isDesktop = theme.breakpoints.up('md'), so the two stay in lockstep.
export function useIsMobile() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("md"));
}
