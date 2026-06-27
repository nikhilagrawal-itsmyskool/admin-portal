import React, { useEffect } from "react";
import PrintRoot from "./PrintRoot";

// When `open`, mounts `children` into the print overlay, fires the browser print
// dialog once laid out, and calls `onClose` when the dialog finishes/cancels.
export default function PrintLayer({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const done = () => onClose && onClose();
    window.addEventListener("afterprint", done);
    // Let the portal content paint before invoking the dialog.
    const t = setTimeout(() => window.print(), 150);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [open, onClose]);

  if (!open) return null;
  return <PrintRoot>{children}</PrintRoot>;
}
