import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

// Shared DataGrid styling used by every list page. Applied on desktop when the
// page does not pass its own `sx`, so the look stays identical to before.
const DEFAULT_GRID_SX = {
  border: "none",
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 600 },
  "& .MuiDataGrid-cell": { borderBottom: "1px solid #e4e9f2" },
  "& .deleted-row": {
    opacity: 0.6,
    backgroundColor: "rgba(244, 67, 54, 0.04)",
    "& .MuiDataGrid-cell:not(:last-of-type)": {
      textDecoration: "line-through",
    },
  },
};

// Resolve a single cell's display content from a MUI X column definition,
// mirroring the DataGrid pipeline: valueGetter -> renderCell | valueFormatter.
// (MUI X v7 signatures: valueGetter(value, row), valueFormatter(value, row).)
function resolveCell(col, row, rowId) {
  const rawValue = row[col.field];
  const value =
    typeof col.valueGetter === "function"
      ? col.valueGetter(rawValue, row)
      : rawValue;
  if (typeof col.renderCell === "function") {
    return col.renderCell({
      value,
      row,
      field: col.field,
      id: rowId,
      colDef: col,
    });
  }
  if (typeof col.valueFormatter === "function") {
    return col.valueFormatter(value, row);
  }
  return value;
}

// Render whatever resolveCell produced: a React element passes through, a
// primitive is wrapped in body text (with an em-dash fallback for empties).
function renderValue(content) {
  if (React.isValidElement(content)) return content;
  if (content === null || content === undefined || content === "") {
    return (
      <Typography variant="body2" component="span">
        —
      </Typography>
    );
  }
  return (
    <Typography variant="body2" component="span">
      {content}
    </Typography>
  );
}

/**
 * Drop-in replacement for `<Card><DataGrid .../></Card>`.
 *
 * Desktop (>= sm): renders the original Card + DataGrid unchanged.
 * Mobile (< sm): renders a stack of cards derived from the same `columns`,
 * reusing each column's headerName + renderCell/valueGetter/valueFormatter, so
 * nothing clips off-screen the way a DataGrid does on a narrow viewport.
 *
 * Extra props (mobile-only):
 *  - titleField:       column shown as the bold card title (default: first column)
 *  - primaryChipField: column rendered as a chip in the top-right of the card header
 *  - renderMobileCard: (row) => node  escape hatch for fully custom cards
 *  - mobilePageSize:   render first N rows with a "Load more" button (default: all)
 *  - emptyMessage:     text when there are no rows
 *  - cardSx:           sx for the desktop wrapper Card
 */
export default function ResponsiveDataGrid({
  rows = [],
  columns = [],
  getRowId,
  getRowClassName,
  loading = false,
  sx,
  cardSx,
  disableCard = false,
  titleField,
  primaryChipField,
  renderMobileCard,
  mobilePageSize,
  onRowClick,
  onCardClick,
  emptyMessage = "No records found.",
  hideActionsOnMobile = false,
  ...dataGridProps
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [visibleCount, setVisibleCount] = useState(mobilePageSize || 0);

  const rowId = (row) => (getRowId ? getRowId(row) : row.id);

  // ---- Desktop: unchanged Card + DataGrid (or bare grid when disableCard) ----
  if (!isMobile) {
    const grid = (
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        getRowClassName={getRowClassName}
        loading={loading}
        onRowClick={onRowClick}
        sx={sx ?? DEFAULT_GRID_SX}
        {...dataGridProps}
      />
    );
    return disableCard ? grid : <Card sx={cardSx}>{grid}</Card>;
  }

  // ---- Mobile: stack of cards ----
  if (loading) {
    return (
      <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
        Loading...
      </Typography>
    );
  }

  if (!rows.length) {
    return (
      <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
        {emptyMessage}
      </Typography>
    );
  }

  const titleCol =
    (titleField && columns.find((c) => c.field === titleField)) || columns[0];
  const actionsCol = columns.find((c) => c.field === "actions");
  const chipCol = primaryChipField
    ? columns.find((c) => c.field === primaryChipField)
    : null;
  const bodyCols = columns.filter(
    (c) =>
      c.field !== titleCol?.field &&
      c.field !== "actions" &&
      c.field !== primaryChipField,
  );

  const limit = mobilePageSize ? visibleCount || mobilePageSize : rows.length;
  const visibleRows = rows.slice(0, limit);
  const hasMore = mobilePageSize && rows.length > limit;

  return (
    <Stack spacing={2}>
      {visibleRows.map((row) => {
        const id = rowId(row);
        const cls = getRowClassName ? getRowClassName({ row, id }) : "";
        const isDeleted = String(cls).includes("deleted-row");

        if (renderMobileCard) {
          return (
            <React.Fragment key={id}>{renderMobileCard(row)}</React.Fragment>
          );
        }

        const clickable =
          typeof onCardClick === "function" || typeof onRowClick === "function";
        return (
          <Card
            key={id}
            onClick={
              onCardClick
                ? () => onCardClick(row)
                : onRowClick
                  ? () => onRowClick({ row, id })
                  : undefined
            }
            sx={{
              ...(isDeleted
                ? { opacity: 0.6, bgcolor: "rgba(244, 67, 54, 0.04)" }
                : {}),
              ...(clickable ? { cursor: "pointer" } : {}),
            }}
          >
            <CardContent sx={{ pb: "12px !important" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 1,
                  mb: bodyCols.length ? 1 : 0,
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  sx={
                    isDeleted ? { textDecoration: "line-through" } : undefined
                  }
                >
                  {resolveCell(titleCol, row, id)}
                </Typography>
                {chipCol && <Box>{resolveCell(chipCol, row, id)}</Box>}
              </Box>

              {bodyCols.map((col) => (
                <Box
                  key={col.field}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                    py: 0.25,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {col.headerName || col.field}
                  </Typography>
                  <Box sx={{ textAlign: "right" }}>
                    {renderValue(resolveCell(col, row, id))}
                  </Box>
                </Box>
              ))}

              {actionsCol && !hideActionsOnMobile && (
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.5,
                    mt: 1,
                    pt: 1,
                    borderTop: "1px solid #eef1f6",
                  }}
                >
                  {resolveCell(actionsCol, row, id)}
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}

      {hasMore && (
        <Button
          variant="outlined"
          onClick={() => setVisibleCount(limit + (mobilePageSize || 10))}
        >
          Load more ({rows.length - limit} more)
        </Button>
      )}
    </Stack>
  );
}
