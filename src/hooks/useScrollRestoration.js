import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Remembers each screen's scroll position (keyed by pathname) and restores it when you
// return — covering both the OS/browser back (POP) and the app's in-app Back buttons,
// which navigate('/list') i.e. PUSH a new history entry. Operates on a scroll-container
// ref (MainLayout's <main> Box), not window, since that Box is the only scroller.
export function useScrollRestoration(containerRef) {
  const { pathname } = useLocation();
  const positions = useRef(new Map());
  const restoring = useRef(false);

  // Record the current screen's scroll offset as the user scrolls (skip while we're
  // programmatically restoring, so a clamped value doesn't overwrite the saved one).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      if (!restoring.current) positions.current.set(pathname, el.scrollTop);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef, pathname]);

  // On pathname change, restore the saved offset (or reset to top for a fresh screen).
  // Lists refetch on mount, so the container is short when this first runs — re-apply the
  // offset each frame until the content is tall enough to hold it, capped at ~1s.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const saved = positions.current.get(pathname) ?? 0;

    if (saved === 0) {
      el.scrollTop = 0;
      return undefined;
    }

    restoring.current = true;
    let raf = 0;
    const start = performance.now();
    const apply = () => {
      const node = containerRef.current;
      if (!node) {
        restoring.current = false;
        return;
      }
      node.scrollTop = saved;
      const tallEnough = node.scrollHeight - node.clientHeight >= saved;
      if (tallEnough || performance.now() - start >= 1000) {
        restoring.current = false;
      } else {
        raf = requestAnimationFrame(apply);
      }
    };
    raf = requestAnimationFrame(apply);
    return () => {
      cancelAnimationFrame(raf);
      restoring.current = false;
    };
  }, [containerRef, pathname]);
}
