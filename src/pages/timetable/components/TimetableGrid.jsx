import React, { useState } from "react";
import { Box, Typography, Paper, useMediaQuery, useTheme } from "@mui/material";
import EditCellDialog from "./EditCellDialog";

const DOW_LABEL = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};
const FIXED_BG = "#eef1f7";
const TEACH_BG = "#ffffff";
const REG_BG = "#fff4f4";

const withCode = (name, code) => (code ? `${name} (${code})` : name || "");

// Renders a weekday×period grid from a config (days[].slots[]) and entries.
// mode 'class' filters by classId and shows the teacher in each cell; mode 'teacher'
// filters by teacherId and shows the class. Subjects, teachers and classes all show
// name + code. Band cells (several entries sharing a slot) stack their offerings.
export default function TimetableGrid({
  config,
  entries = [],
  mode,
  selectedId,
  classById = {},
  teacherById = {},
  editable = false,
  publishedTimetableId,
  onChanged,
  hideNonTeaching = true,
  fitToWidth = true,
}) {
  const [editingCell, setEditingCell] = useState(null); // { day, slot, items }
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  if (!config?.days?.length)
    return (
      <Typography sx={{ color: "#8f9bb3" }}>No grid configured.</Typography>
    );

  const days = [...config.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const seqs = [
    ...new Set(days.flatMap((d) => (d.slots || []).map((s) => s.sequence))),
  ].sort((a, b) => a - b);
  // Periods that are teaching on at least one day; hide the rest (break / assembly /
  // lunch / registration) when hideNonTeaching is on.
  const teachingSeqs = seqs.filter((seq) =>
    days.some((d) =>
      (d.slots || []).some(
        (s) => s.sequence === seq && s.slotType === "teaching",
      ),
    ),
  );
  const visibleSeqs = hideNonTeaching ? teachingSeqs : seqs;

  const mine = entries.filter((e) =>
    mode === "class" ? e.classId === selectedId : e.teacherId === selectedId,
  );
  const bySlot = new Map();
  for (const e of mine) {
    if (!bySlot.has(e.timeSlotId)) bySlot.set(e.timeSlotId, []);
    bySlot.get(e.timeSlotId).push(e);
  }

  const subjLabel = (e) =>
    withCode(e.subjectName || e.subjectId, e.subjectCode);
  const teacherLabel = (id) =>
    withCode(teacherById[id]?.name || id, teacherById[id]?.code);
  const classLabel = (id) =>
    withCode(classById[id]?.name || id, classById[id]?.code);
  // The "other party" shown under the subject: teacher in class view, class in teacher view.
  const otherLabel = (e) =>
    mode === "class"
      ? e.teacherId
        ? teacherLabel(e.teacherId)
        : "—"
      : classLabel(e.classId);

  const cell = (day, seq) => {
    const slot = (day.slots || []).find((s) => s.sequence === seq);
    if (!slot) return <Box sx={{ minHeight: 64 }} />;
    if (slot.slotType === "registration") {
      const regItems = bySlot.get(slot.uuid) || [];
      return (
        <Box
          sx={{
            minHeight: 64,
            bgcolor: REG_BG,
            border: "1px solid #f0c9c9",
            borderRadius: 1,
            p: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, display: "block", lineHeight: 1.25 }}
          >
            {slot.label || "Registration"}
          </Typography>
          {regItems.map((e) => (
            <Typography
              key={e.uuid}
              variant="caption"
              sx={{ color: "#5a6473", display: "block", lineHeight: 1.25 }}
            >
              {mode === "class"
                ? teacherLabel(e.teacherId)
                : classLabel(e.classId)}
            </Typography>
          ))}
          {regItems.length === 0 && (
            <Typography
              variant="caption"
              sx={{ color: "#8f9bb3", fontStyle: "italic" }}
            >
              Attendance
            </Typography>
          )}
        </Box>
      );
    }
    if (slot.slotType !== "teaching") {
      return (
        <Box
          sx={{
            minHeight: 64,
            bgcolor: FIXED_BG,
            borderRadius: 1,
            p: 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "#8f9bb3", fontStyle: "italic" }}
          >
            {slot.label || slot.slotType}
          </Typography>
        </Box>
      );
    }
    const items = bySlot.get(slot.uuid) || [];
    const canEdit = editable && items.length > 0;
    return (
      <Box
        onClick={canEdit ? () => setEditingCell({ day, slot, items }) : undefined}
        sx={{
          minHeight: 64,
          bgcolor: TEACH_BG,
          border: "1px solid #e4e9f2",
          borderRadius: 1,
          p: 0.5,
          cursor: canEdit ? "pointer" : "default",
          "&:hover": canEdit ? { borderColor: "#598bff", boxShadow: 1 } : undefined,
        }}
      >
        {items.map((e) => (
          <Box key={e.uuid} sx={{ mb: items.length > 1 ? 0.5 : 0 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, display: "block", lineHeight: 1.25 }}
            >
              {subjLabel(e)}
              {e.bandId ? " *" : ""}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#5a6473", display: "block", lineHeight: 1.25 }}
            >
              {otherLabel(e)}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  // Desktop: transposed grid (periods across, days down). fitToWidth makes columns fill
  // the width (cells shrink to fit screen/page); otherwise a fixed min-width + scroll.
  const desktopGrid = (
    <Paper
      variant="outlined"
      sx={{ overflowX: fitToWidth ? "visible" : "auto", p: 1 }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: fitToWidth
            ? `72px repeat(${visibleSeqs.length}, 1fr)`
            : `100px repeat(${visibleSeqs.length}, minmax(150px, 1fr))`,
          gap: 0.5,
          ...(fitToWidth ? {} : { minWidth: 100 + visibleSeqs.length * 150 }),
        }}
      >
        {/* Header row: corner + one column per period (x-axis = periods). */}
        <Box sx={{ fontWeight: 600, p: 0.5 }}>
          <Typography variant="caption">Day</Typography>
        </Box>
        {visibleSeqs.map((seq, idx) => (
          <Box key={`h-${seq}`} sx={{ p: 0.5, textAlign: "center" }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: "#8f9bb3" }}
            >
              {hideNonTeaching ? idx + 1 : seq}
            </Typography>
          </Box>
        ))}
        {/* One row per day (y-axis = days); cells are that day's periods left→right. */}
        {days.map((d) => (
          <React.Fragment key={d.uuid}>
            <Box sx={{ p: 0.5, display: "flex", alignItems: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {d.label || DOW_LABEL[d.dayOfWeek] || d.dayOfWeek}
              </Typography>
            </Box>
            {visibleSeqs.map((seq) => (
              <Box key={`${d.uuid}-${seq}`}>{cell(d, seq)}</Box>
            ))}
          </React.Fragment>
        ))}
      </Box>
    </Paper>
  );

  // Mobile: the wide grid is awkward on a phone, so stack one section per day with its
  // periods listed vertically (period number left, the same cell right). Reuses cell().
  const mobileList = (
    <Box>
      {days.map((d) => (
        <Paper key={d.uuid} variant="outlined" sx={{ mb: 1.5, p: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {d.label || DOW_LABEL[d.dayOfWeek] || d.dayOfWeek}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "36px 1fr",
              gap: 0.5,
              alignItems: "stretch",
            }}
          >
            {visibleSeqs.map((seq, idx) => (
              <React.Fragment key={`${d.uuid}-${seq}`}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: "#8f9bb3" }}
                  >
                    {hideNonTeaching ? idx + 1 : seq}
                  </Typography>
                </Box>
                <Box>{cell(d, seq)}</Box>
              </React.Fragment>
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );

  return (
    <Box>
      {isMobile ? mobileList : desktopGrid}
      <Typography
        variant="caption"
        sx={{ color: "#8f9bb3", mt: 1, display: "block" }}
      >
        * = elective band (parallel options)
        {editable ? " · tap a period to edit, move or swap it" : ""}
      </Typography>
      {editingCell && (
        <EditCellDialog
          open
          onClose={() => setEditingCell(null)}
          publishedTimetableId={publishedTimetableId}
          classId={selectedId}
          group={editingCell.items}
          config={config}
          allEntries={entries}
          onChanged={() => onChanged && onChanged()}
        />
      )}
    </Box>
  );
}
