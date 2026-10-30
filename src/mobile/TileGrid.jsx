import React from "react";
import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { ChevronRight as ChevronRightIcon } from "@mui/icons-material";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import SortableTile from "../components/SortableTile";

// The mobile tile grid, shared by the home bands and the hub screens. Each tile shows an
// icon + label; a `hub` tile (count set) gets a ›-affordance hinting it opens a sub-menu.
//
// When `editable` + `editMode`, tiles jiggle and become draggable (long-press to enter edit
// mode via onEnterEdit, drag to reorder via onReorder, tap ✕ to hide via onHide). Hub screens
// pass neither, so they stay plain navigable grids.
export default function TileGrid({
  tiles,
  onOpen,
  editable = false,
  editMode = false,
  onEnterEdit,
  onHide,
  onReorder,
  groupId,
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const renderCard = (t) => {
    const Icon = t.icon;
    const isHub = t.kind === "hub";
    const color = t.color || "#3366ff";
    return (
      <Card variant="outlined">
        <CardActionArea onClick={editMode ? undefined : () => onOpen(t)}>
          <CardContent
            sx={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              py: 2.5,
              textAlign: "center",
            }}
          >
            {isHub && (
              <ChevronRightIcon
                sx={{ position: "absolute", top: 6, right: 6, fontSize: 18, color: "text.disabled" }}
              />
            )}
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2,
                backgroundColor: `${color}1f`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon sx={{ fontSize: 26, color }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t.title}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  };

  const grid = (children) => (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 1.5,
      }}
    >
      {children}
    </Box>
  );

  if (!editable) {
    return grid(
      tiles.map((t) => <React.Fragment key={t.id ?? t.path}>{renderCard(t)}</React.Fragment>),
    );
  }

  const ids = tiles.map((t) => t.id ?? t.path);
  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    if (from === -1 || to === -1) return;
    onReorder?.(groupId, arrayMove(ids, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        {grid(
          tiles.map((t, i) => (
            <SortableTile
              key={t.id ?? t.path}
              id={t.id ?? t.path}
              index={i}
              editMode={editMode}
              onEnterEdit={onEnterEdit}
              onHide={onHide}
            >
              {renderCard(t)}
            </SortableTile>
          )),
        )}
      </SortableContext>
    </DndContext>
  );
}
