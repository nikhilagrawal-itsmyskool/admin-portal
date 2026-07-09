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
  MoreVert as MenuIcon,
} from "@mui/icons-material";

const isIos = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true);

// "Install app" button. It stays visible whenever the app isn't already installed:
//  - If Chrome/Edge captured a native install prompt (main.jsx → window.deferredInstallPrompt),
//    tapping it fires that one-tap install.
//  - Otherwise (iOS Safari, or Android/desktop before Chrome offers its prompt) it opens
//    platform-aware Add-to-Home-Screen instructions, since the page can't drive the
//    browser's install menu itself.
// Renders nothing once the app is running installed (standalone).
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
  const [helpOpen, setHelpOpen] = useState(false);

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

  const handleClick = async () => {
    if (deferred) {
      // Native one-tap install (Android/desktop Chromium).
      deferred.prompt();
      try {
        await deferred.userChoice;
      } finally {
        window.deferredInstallPrompt = null;
        setDeferred(null);
      }
    } else {
      // No native prompt available — show how to install manually.
      setHelpOpen(true);
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
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)}>
        <DialogTitle>Install ItsMySkool</DialogTitle>
        <DialogContent>
          {ios ? (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                In <strong>Safari</strong>, add this app to your home screen:
              </Typography>
              <Box component="ol" sx={{ pl: 2.5, m: 0, "& li": { mb: 1 } }}>
                <li>
                  Tap the <strong>Share</strong> button{" "}
                  <ShareIcon
                    fontSize="inherit"
                    sx={{ verticalAlign: "middle" }}
                  />{" "}
                  in the toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> — the app appears on your home screen.
                </li>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Add this app to your home screen:
              </Typography>
              <Box component="ol" sx={{ pl: 2.5, m: 0, "& li": { mb: 1 } }}>
                <li>
                  Open the browser menu{" "}
                  <MenuIcon
                    fontSize="inherit"
                    sx={{ verticalAlign: "middle" }}
                  />{" "}
                  (top-right).
                </li>
                <li>
                  Tap <strong>Install app</strong> or{" "}
                  <strong>Add to Home screen</strong>.
                </li>
                <li>
                  Confirm <strong>Install</strong>. (On a computer, use the
                  install icon in the address bar.)
                </li>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>Got it</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
