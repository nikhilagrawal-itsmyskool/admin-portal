import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import useLongPress from "../hooks/useLongPress";
import "./tileEdit.css";

// Wraps a single tile with the home-screen-icon editing behaviour:
//  • not editing  → a long-press enters edit mode (onEnterEdit); taps pass through to the tile.
//  • editing      → the whole tile is a drag handle (reorder), it jiggles, and a ✕ badge hides
//                   it. The tile's own click is neutralised (pointer-events: none on the inner
//                   wrapper) so dragging/tapping never navigates.
export default function SortableTile({ id, index = 0, editMode, onEnterEdit, onHide, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editMode,
  });
  const longPress = useLongPress(() => {
    if (!editMode) onEnterEdit?.();
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : 1,
    // Stop the browser from scrolling/zooming while dragging a tile in edit mode.
    touchAction: editMode ? "none" : "manipulation",
    "--jiggle-delay": `${(index % 6) * 45}ms`,
  };

  // In edit mode the whole tile is the drag handle; otherwise it listens for a long-press.
  const interaction = editMode ? { ...attributes, ...listeners } : longPress;

  return (
    <Box ref={setNodeRef} className="ims-tile" style={style} {...interaction}>
      {editMode && (
        <IconButton
          className="ims-tile__remove"
          size="small"
          aria-label="Hide tile"
          // Keep the ✕ from starting a drag; stop it reaching the tile beneath.
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onHide?.(id);
          }}
        >
          <CloseIcon sx={{ fontSize: 15 }} />
        </IconButton>
      )}
      <Box className={editMode && !isDragging ? "ims-tile__jig ims-tile--jiggle" : "ims-tile__jig"}>
        <Box sx={{ pointerEvents: editMode ? "none" : "auto" }}>{children}</Box>
      </Box>
    </Box>
  );
}
