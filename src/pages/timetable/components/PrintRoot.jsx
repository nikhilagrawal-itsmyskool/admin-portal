import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";

// Renders its children into a #print-root div appended to <body>. Combined with
// print.css, only this content prints. Mounting it and calling window.print()
// produces the printable layout; unmount to return to normal.
export default function PrintRoot({ children }) {
  const elRef = useRef(null);
  if (!elRef.current && typeof document !== "undefined") {
    const el = document.createElement("div");
    el.id = "print-root";
    elRef.current = el;
  }

  useEffect(() => {
    const el = elRef.current;
    document.body.appendChild(el);
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  if (!elRef.current) return null;
  return ReactDOM.createPortal(children, elRef.current);
}
