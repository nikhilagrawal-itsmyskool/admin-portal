import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Button,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import { Print as PrintIcon } from "@mui/icons-material";
import { classService } from "../../../services/classService";
import { resolveTeachers } from "./teacherDirectory";
import PrintLayer from "./PrintLayer";

const DOW_LABEL = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

// Split an array into n contiguous, roughly-even chunks.
function splitEven(arr, n) {
  const out = [];
  const size = Math.ceil(arr.length / n) || 1;
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  while (out.length < n) out.push([]);
  return out.slice(0, n);
}

// Build the column (period) model and per-day slot lookup from the grid config.
function useColumns(config) {
  return useMemo(() => {
    const days = [...(config?.days || [])].sort(
      (a, b) => a.dayOfWeek - b.dayOfWeek,
    );
    const seqSet = new Set();
    const slotByDaySeq = new Map(); // `${day}|${seq}` -> slot
    const timeBySeq = new Map();
    for (const d of days) {
      for (const s of d.slots || []) {
        seqSet.add(s.sequence);
        slotByDaySeq.set(`${d.dayOfWeek}|${s.sequence}`, s);
        if (!timeBySeq.has(s.sequence) && s.startTime) {
          timeBySeq.set(
            s.sequence,
            `${s.startTime}${s.endTime ? `–${s.endTime}` : ""}`,
          );
        }
      }
    }
    const seqs = [...seqSet].sort((a, b) => a - b);
    const columns = seqs.map((seq) => ({
      seq,
      time: timeBySeq.get(seq) || "",
    }));
    return { days, columns, slotByDaySeq };
  }, [config]);
}

// One contiguous block of the master: a subset of class-rows × a subset of period columns.
function MasterPanel({
  title,
  subtitle,
  marker,
  classRows,
  columns,
  days,
  slotByDaySeq,
  entriesByKey,
  classNameById,
  teacherCode,
  dense,
}) {
  const cellText = (classId, dayOfWeek, seq) => {
    const slot = slotByDaySeq.get(`${dayOfWeek}|${seq}`);
    if (!slot) return "";
    if (slot.slotType === "registration") {
      const items =
        entriesByKey.get(`${classId}|${dayOfWeek}|${slot.uuid}`) || [];
      const code = items[0] ? teacherCode(items[0].teacherId) : "";
      return code ? `Reg ${code}` : "Reg";
    }
    if (slot.slotType !== "teaching") return slot.label || slot.slotType;
    const items =
      entriesByKey.get(`${classId}|${dayOfWeek}|${slot.uuid}`) || [];
    return items
      .map((e) => {
        const subj = e.subjectName || e.subjectId;
        const code = teacherCode(e.teacherId);
        return code ? `${subj} (${code})` : subj;
      })
      .join(" / ");
  };

  const fs = dense ? 8 : 10; // px
  const pad = dense ? "1px 2px" : "2px 4px";
  const cellSx = {
    fontSize: fs,
    p: pad,
    border: "1px solid #bbb",
    lineHeight: 1.15,
    verticalAlign: "top",
  };
  const headSx = {
    ...cellSx,
    fontWeight: 700,
    background: "#f0f3ff",
    textAlign: "center",
  };

  return (
    <Box className="print-page" sx={{ mb: 2 }}>
      {(title || marker) && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="baseline"
          sx={{ mb: 0.5 }}
        >
          <Box>
            {title && (
              <Typography sx={{ fontWeight: 700, fontSize: dense ? 12 : 16 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography sx={{ fontSize: dense ? 9 : 12, color: "#555" }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {marker && (
            <Typography sx={{ fontSize: 9, color: "#888" }}>
              {marker}
            </Typography>
          )}
        </Stack>
      )}
      <Table
        size="small"
        sx={{ tableLayout: "fixed", width: "100%", borderCollapse: "collapse" }}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headSx, width: dense ? 54 : 70 }}>
              Class
            </TableCell>
            <TableCell sx={{ ...headSx, width: dense ? 34 : 44 }}>
              Day
            </TableCell>
            {columns.map((c) => (
              <TableCell key={c.seq} sx={headSx}>
                <div>P{c.seq}</div>
                {c.time && (
                  <div style={{ fontWeight: 400, fontSize: fs - 1 }}>
                    {c.time}
                  </div>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {classRows.map((classId) =>
            days.map((d, di) => (
              <TableRow key={`${classId}|${d.dayOfWeek}`}>
                {di === 0 && (
                  <TableCell
                    rowSpan={days.length}
                    sx={{ ...cellSx, fontWeight: 700, background: "#fafbff" }}
                  >
                    {classNameById[classId] || classId}
                  </TableCell>
                )}
                <TableCell sx={{ ...cellSx, fontWeight: 600 }}>
                  {DOW_LABEL[d.dayOfWeek] || d.dayOfWeek}
                </TableCell>
                {columns.map((c) => (
                  <TableCell key={c.seq} sx={cellSx}>
                    {cellText(classId, d.dayOfWeek, c.seq)}
                  </TableCell>
                ))}
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function MasterTimetable({
  config,
  entries = [],
  title = "Master Timetable",
  subtitle = "",
}) {
  const { days, columns, slotByDaySeq } = useColumns(config);
  const [classNameById, setClassNameById] = useState({});
  const [teacherMap, setTeacherMap] = useState(new Map());
  const [tiles, setTiles] = useState(1); // N in N×N
  const [printing, setPrinting] = useState(false);

  const classIds = useMemo(
    () => [...new Set(entries.map((e) => e.classId))],
    [entries],
  );

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
    resolveTeachers(entries.map((e) => e.teacherId)).then(setTeacherMap);
  }, [entries]);

  const teacherCode = (id) => (id ? teacherMap.get(id)?.code || "" : "");

  // Sort classes by display name for a stable master order.
  const sortedClassIds = useMemo(
    () =>
      [...classIds].sort((a, b) =>
        (classNameById[a] || a).localeCompare(
          classNameById[b] || b,
          undefined,
          { numeric: true },
        ),
      ),
    [classIds, classNameById],
  );

  const entriesByKey = useMemo(() => {
    const m = new Map();
    for (const e of entries) {
      const k = `${e.classId}|${e.dayOfWeek}|${e.timeSlotId}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(e);
    }
    return m;
  }, [entries]);

  // Teacher legend: code -> full name, for teachers present in this scope.
  const legend = useMemo(() => {
    const seen = new Map();
    for (const e of entries) {
      if (!e.teacherId) continue;
      const t = teacherMap.get(e.teacherId);
      if (t?.code && !seen.has(t.code)) seen.set(t.code, t.name);
    }
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries, teacherMap]);

  // N×N panels for the printable poster.
  const panels = useMemo(() => {
    const rowBands = splitEven(sortedClassIds, tiles);
    const colBands = splitEven(columns, tiles);
    const out = [];
    for (let r = 0; r < rowBands.length; r++) {
      for (let c = 0; c < colBands.length; c++) {
        if (rowBands[r].length === 0 || colBands[c].length === 0) continue;
        out.push({ rows: rowBands[r], cols: colBands[c], r: r + 1, c: c + 1 });
      }
    }
    return out;
  }, [sortedClassIds, columns, tiles]);

  const commonProps = {
    days,
    slotByDaySeq,
    entriesByKey,
    classNameById,
    teacherCode,
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ mb: 2 }}
        className="no-print"
      >
        <TextField
          select
          size="small"
          label="Print size"
          value={tiles}
          onChange={(e) => setTiles(Number(e.target.value))}
          sx={{ width: 200 }}
          helperText="A4 landscape sheets to tile together"
        >
          <MenuItem value={1}>1 sheet (1×1)</MenuItem>
          <MenuItem value={2}>4 sheets (2×2)</MenuItem>
          <MenuItem value={3}>9 sheets (3×3)</MenuItem>
        </TextField>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => setPrinting(true)}
        >
          Print Master
        </Button>
      </Stack>

      {/* On-screen: the full master in one scrollable grid. */}
      <Paper variant="outlined" sx={{ overflowX: "auto", p: 1 }}>
        <MasterPanel
          {...commonProps}
          classRows={sortedClassIds}
          columns={columns}
          dense={false}
        />
        {legend.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 12, mb: 0.5 }}>
              Teacher codes
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
              {legend.map(([code, name]) => (
                <Typography
                  key={code}
                  sx={{ fontSize: 11, color: "#555", mr: 2 }}
                >
                  <b>{code}</b> = {name}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Printable poster: N×N panels, each its own A4 page, in reading order. */}
      <PrintLayer open={printing} onClose={() => setPrinting(false)}>
        <Box sx={{ p: 0 }}>
          {panels.map((p) => (
            <MasterPanel
              key={`${p.r}-${p.c}`}
              {...commonProps}
              title={title}
              subtitle={subtitle}
              marker={
                tiles > 1
                  ? `Sheet (row ${p.r}, col ${p.c}) of ${tiles}×${tiles}`
                  : ""
              }
              classRows={p.rows}
              columns={p.cols}
              dense={tiles >= 3}
            />
          ))}
          <Box className="print-page">
            <Typography sx={{ fontWeight: 700, fontSize: 12, mb: 0.5 }}>
              Teacher codes
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
              {legend.map(([code, name]) => (
                <Typography key={code} sx={{ fontSize: 11, mr: 2 }}>
                  <b>{code}</b> = {name}
                </Typography>
              ))}
            </Stack>
          </Box>
        </Box>
      </PrintLayer>
    </Box>
  );
}
