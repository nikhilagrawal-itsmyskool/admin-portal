import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  Chip,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import {
  GridOn as ExcelIcon,
  PictureAsPdf as PdfIcon,
  Edit as EditIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { classService } from "../../../services/classService";
import { resolveTeachers } from "./teacherDirectory";
import { useTimetablePerms } from "./usePerms";
import { buildTrueMaster } from "./trueMaster";
import { downloadRunExport } from "./exportDownload";
import EditCellDialog from "./EditCellDialog";

const DOW_FULL = {
  1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday",
  5: "Friday", 6: "Saturday", 7: "Sunday",
};

const cellSx = {
  fontSize: 11,
  p: "3px 6px",
  border: "1px solid #bbb",
  lineHeight: 1.2,
  verticalAlign: "top",
};
const headSx = { ...cellSx, fontWeight: 700, background: "#f0f3ff", textAlign: "center" };
const breakSx = { ...cellSx, background: "#ffdede", width: 34, textAlign: "center", color: "#c0392b", fontWeight: 700 };

// -------- Aggregated block view: one row per class, cells stack Subject (days) / teacher.
function AggregatedView({ model }) {
  return (
    <Paper variant="outlined" sx={{ overflowX: "auto", p: 1 }}>
      <Table size="small" sx={{ borderCollapse: "collapse", width: "auto" }}>
        <TableHead>
          <TableRow>
            {model.columns.map((c) => (
              <TableCell key={c.key} sx={c.kind === "break" ? { ...breakSx, ...headSx, background: "#ffb3b3" } : headSx}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {model.rows.map((row) => (
            <TableRow key={row.classId}>
              {model.columns.map((col) => {
                if (col.kind === "class") {
                  return (
                    <TableCell key={col.key} sx={{ ...cellSx, fontWeight: 700, background: "#fafbff", whiteSpace: "nowrap" }}>
                      {row.className}
                    </TableCell>
                  );
                }
                if (col.kind === "break") return <TableCell key={col.key} sx={breakSx} />;
                if (col.kind === "diary") return <TableCell key={col.key} sx={{ ...cellSx, minWidth: 60 }} />;
                const groups = row.cells[col.key] || [];
                return (
                  <TableCell key={col.key} sx={{ ...cellSx, minWidth: 120 }}>
                    {groups.map((g, i) => (
                      <Box key={i} sx={{ mb: groups.length > 1 ? 0.5 : 0 }}>
                        <span style={{ fontWeight: 600 }}>
                          {g.subject} ({g.daysLabel})
                        </span>
                        {g.teachers.length > 0 && (
                          <div style={{ color: "#5a6473" }}>{g.teachers.join(" / ")}</div>
                        )}
                      </Box>
                    ))}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

// -------- Edit view: the block is expanded to a per-day, per-class editable grid. Each
// teaching cell opens EditCellDialog (reused from the individual grid) for that class.
function EditableExpandedView({ config, entries, publishedTimetableId, classNameById, teacherNameById, onChanged }) {
  const [editingCell, setEditingCell] = useState(null); // { classId, day, group }
  const days = useMemo(
    () => [...(config?.days || [])].filter((d) => (d.slots || []).length > 0).sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    [config],
  );
  const classIds = useMemo(() => {
    const model = buildTrueMaster({ config, entries, classNameById, teacherNameById });
    return model.rows.map((r) => r.classId);
  }, [config, entries, classNameById, teacherNameById]);

  // entries indexed by (classId, dayOfWeek, timeSlotId)
  const byKey = useMemo(() => {
    const m = new Map();
    for (const e of entries) {
      const k = `${e.classId}|${e.dayOfWeek}|${e.timeSlotId}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(e);
    }
    return m;
  }, [entries]);

  const teachingSlots = (day) => (day.slots || []).filter((s) => s.slotType === "teaching").sort((a, b) => a.sequence - b.sequence);

  return (
    <Box>
      <Typography variant="caption" sx={{ color: "#8f9bb3", mb: 1, display: "block" }}>
        Editing — click any period to change, move or swap it. Exit edit to see the compact master.
      </Typography>
      {days.map((day) => {
        const slots = teachingSlots(day);
        return (
          <Paper key={day.uuid} variant="outlined" sx={{ overflowX: "auto", p: 1, mb: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>{DOW_FULL[day.dayOfWeek] || day.dayOfWeek}</Typography>
            <Table size="small" sx={{ borderCollapse: "collapse", width: "auto" }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headSx, width: 80 }}>Class</TableCell>
                  {slots.map((s, i) => (
                    <TableCell key={s.uuid} sx={headSx}>{s.label || `P${i + 1}`}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {classIds.map((classId) => (
                  <TableRow key={classId}>
                    <TableCell sx={{ ...cellSx, fontWeight: 700, background: "#fafbff", whiteSpace: "nowrap" }}>
                      {classNameById[classId] || classId}
                    </TableCell>
                    {slots.map((s) => {
                      const group = byKey.get(`${classId}|${day.dayOfWeek}|${s.uuid}`) || [];
                      const canEdit = group.length > 0;
                      return (
                        <TableCell
                          key={s.uuid}
                          onClick={canEdit ? () => setEditingCell({ classId, day, group }) : undefined}
                          sx={{
                            ...cellSx,
                            minWidth: 110,
                            cursor: canEdit ? "pointer" : "default",
                            "&:hover": canEdit ? { background: "#eef4ff" } : undefined,
                          }}
                        >
                          {group.map((e) => (
                            <Box key={e.uuid}>
                              <span style={{ fontWeight: 600 }}>
                                {e.subjectName || e.subjectId}
                                {e.bandId ? " *" : ""}
                              </span>
                              {e.teacherId && (
                                <div style={{ color: "#5a6473" }}>
                                  {teacherNameById[e.teacherId]?.name || ""}
                                </div>
                              )}
                            </Box>
                          ))}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        );
      })}
      {editingCell && (
        <EditCellDialog
          open
          onClose={() => setEditingCell(null)}
          publishedTimetableId={publishedTimetableId}
          classId={editingCell.classId}
          group={editingCell.group}
          config={config}
          allEntries={entries}
          onChanged={() => onChanged && onChanged()}
        />
      )}
    </Box>
  );
}

export default function TrueMasterTimetable({ config, entries = [], publishedTimetableId, sourceRunId, onChanged, effectiveFrom }) {
  const { canMutate, canPrint } = useTimetablePerms();
  const [classNameById, setClassNameById] = useState({});
  const [teacherNameById, setTeacherNameById] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    classService
      .getClasses()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.classes || [];
        const map = {};
        list.forEach((c) => {
          map[c.uuid] = c.name;
        });
        setClassNameById(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ids = [...new Set(entries.map((e) => e.teacherId).filter(Boolean))];
    if (ids.length === 0) {
      setTeacherNameById({});
      return;
    }
    resolveTeachers(ids).then((m) => setTeacherNameById(Object.fromEntries(m)));
  }, [entries]);

  const model = useMemo(
    () => buildTrueMaster({ config, entries, classNameById, teacherNameById }),
    [config, entries, classNameById, teacherNameById],
  );

  const subtitle = effectiveFrom ? `Effective from ${effectiveFrom}` : "";

  // Downloads reuse the source run's already-rendered export in S3 (the consolidated
  // master xlsx/pdf produced by the solver poller). It reflects the timetable AS
  // PUBLISHED; post-publish manual edits are not re-rendered into it.
  const download = async (format) => {
    setBusy(format);
    try {
      await downloadRunExport(sourceRunId, format);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(
        err?.response?.data?.error?.description ||
          `Could not download ${format.toUpperCase()} (it may still be rendering).`,
      );
    } finally {
      setBusy("");
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        {canMutate && (
          <Chip
            icon={editMode ? <CheckIcon /> : <EditIcon />}
            label={editMode ? "Done editing" : "Edit"}
            color={editMode ? "warning" : "default"}
            variant={editMode ? "filled" : "outlined"}
            onClick={() => setEditMode((v) => !v)}
          />
        )}
        {canPrint && !editMode && sourceRunId && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ExcelIcon />}
              disabled={!!busy}
              onClick={() => download("xlsx")}
            >
              {busy === "xlsx" ? "Preparing…" : "Excel"}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PdfIcon />}
              disabled={!!busy}
              onClick={() => download("pdf")}
            >
              {busy === "pdf" ? "Preparing…" : "PDF"}
            </Button>
          </>
        )}
        {subtitle && (
          <Typography variant="caption" sx={{ color: "#8f9bb3" }}>
            {subtitle}
          </Typography>
        )}
      </Stack>

      {editMode ? (
        <EditableExpandedView
          config={config}
          entries={entries}
          publishedTimetableId={publishedTimetableId}
          classNameById={classNameById}
          teacherNameById={teacherNameById}
          onChanged={onChanged}
        />
      ) : (
        <AggregatedView model={model} />
      )}
    </Box>
  );
}
