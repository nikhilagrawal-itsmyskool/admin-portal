import { useRef, useCallback } from "react";

// Detects a press-and-hold (like long-pressing an Android/iOS home-screen icon). Returns
// pointer handlers to spread on an element; `onLongPress` fires once after `delay` ms if the
// pointer hasn't moved more than `moveTolerance` px (so a scroll/drag cancels it, a tap is
// too short to trigger). Pointer-based, so it works for both touch and mouse-hold.
export default function useLongPress(onLongPress, { delay = 450, moveTolerance = 10 } = {}) {
  const timer = useRef(null);
  const origin = useRef(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      // Primary button / touch / pen only — ignore right-click & middle-click.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      origin.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = setTimeout(() => {
        timer.current = null;
        onLongPress?.(e);
      }, delay);
    },
    [clear, delay, onLongPress],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!origin.current) return;
      const dx = Math.abs(e.clientX - origin.current.x);
      const dy = Math.abs(e.clientY - origin.current.y);
      if (dx > moveTolerance || dy > moveTolerance) clear();
    },
    [clear, moveTolerance],
  );

  const end = useCallback(() => {
    clear();
    origin.current = null;
  }, [clear]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerLeave: end,
    onPointerCancel: end,
  };
}
