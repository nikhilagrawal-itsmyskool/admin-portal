import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
} from "@mui/material";
import {
  InstallMobile as InstallIcon,
  IosShare as ShareIcon,
} from "@mui/icons-material";

const isIos = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true);

// A self-hiding "Install app" button. On Chromium (Android/desktop) it fires the native
// install prompt captured early in main.jsx (window.deferredInstallPrompt); on iOS Safari
// — which has no install API — it opens Add-to-Home-Screen instructions. Renders nothing
// once the app is installed (standalone) or when it isn't installable.
export default function InstallButton({
  variant = "outlined",
  size = "small",
  fullWidth = false,
  sx,
}) {
  const [deferred, setDeferred] = useState(
    typeof window !== "undefined" ? window.deferredInstallPrompt : null,
  );
  const [installed, setInstalled] = useState(isStandalone());
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    const onInstallable = () =>
      setDeferred(window.deferredInstallPrompt || null);
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("pwa:installable", onInstallable);
    window.addEventListener("pwa:installed", onInstalled);
    return () => {
      window.removeEventListener("pwa:installable", onInstallable);
      window.removeEventListener("pwa:installed", onInstalled);
    };
  }, []);

  if (installed) return null;

  const ios = isIos();
  // Only show when we can actually install: a captured prompt (Chromium) or iOS Safari.
  if (!deferred && !ios) return null;

  const handleClick = async () => {
    if (deferred) {
      deferred.prompt();
      try {
        await deferred.userChoice;
      } finally {
        window.deferredInstallPrompt = null;
        setDeferred(null);
      }
    } else {
      setIosOpen(true);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        startIcon={<InstallIcon />}
        onClick={handleClick}
        sx={sx}
      >
        Install app
      </Button>
      <Dialog open={iosOpen} onClose={() => setIosOpen(false)}>
        <DialogTitle>Install ItsMySkool</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            In <strong>Safari</strong>, add this app to your home screen:
          </Typography>
          <Box component="ol" sx={{ pl: 2.5, m: 0, "& li": { mb: 1 } }}>
            <li>
              Tap the <strong>Share</strong> button{" "}
              <ShareIcon fontSize="inherit" sx={{ verticalAlign: "middle" }} /> in
              the toolbar.
            </li>
            <li>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong> — the app appears on your home screen.
            </li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIosOpen(false)}>Got it</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
