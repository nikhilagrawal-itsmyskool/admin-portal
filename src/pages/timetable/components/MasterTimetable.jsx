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
import { useTimetablePerms } from "./usePerms";
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
const DOW_FULL = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

// Columns (periods) for a single day, from its slots — the grid is day-varying so each
// day has its own set. Returns [{ seq, time }] in sequence order (incl. -1/0).
function dayColumns(day) {
  return [...(day?.slots || [])]
    .sort((a, b) => a.sequence - b.sequence)
    .map((s) => ({
      seq: s.sequence,
      time: s.startTime
        ? `${s.startTime}${s.endTime ? `–${s.endTime}` : ""}`
        : "",
    }));
}

// One day's master grid: rows = classes, columns = that day's periods.
function DayGrid({
  day,
  columns,
  classRows,
  slotBySeq,
  entriesByKey,
  classNameById,
  teacherCode,
}) {
  const cellText = (classId, seq) => {
    const slot = slotBySeq.get(seq);
    if (!slot) return "";
    if (slot.slotType === "registration") {
      const items =
        entriesByKey.get(`${classId}|${day.dayOfWeek}|${slot.uuid}`) || [];
      const code = items[0] ? teacherCode(items[0].teacherId) : "";
      return code ? `Reg ${code}` : "Reg";
    }
    if (slot.slotType !== "teaching") return slot.label || slot.slotType;
    const items =
      entriesByKey.get(`${classId}|${day.dayOfWeek}|${slot.uuid}`) || [];
    return items
      .map((e) => {
        // Subject name + subject code, then teacher code. e.g. "Maths (MAT) · T07"
        const subj = e.subjectCode
          ? `${e.subjectName || e.subjectId} (${e.subjectCode})`
          : e.subjectName || e.subjectId;
        const tcode = teacherCode(e.teacherId);
        return tcode ? `${subj} · ${tcode}` : subj;
      })
      .join(" / ");
  };

  const cellSx = {
    fontSize: 10,
    p: "2px 4px",
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
    <Table
      size="small"
      sx={{ tableLayout: "fixed", width: "100%", borderCollapse: "collapse" }}
    >
      <TableHead>
        <TableRow>
          <TableCell sx={{ ...headSx, width: 70 }}>Class</TableCell>
          {columns.map((c) => (
            <TableCell key={c.seq} sx={headSx}>
              <div>P{c.seq}</div>
              {c.time && (
                <div style={{ fontWeight: 400, fontSize: 9 }}>{c.time}</div>
              )}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {classRows.map((classId) => (
          <TableRow key={classId}>
            <TableCell
              sx={{ ...cellSx, fontWeight: 700, background: "#fafbff" }}
            >
              {classNameById[classId] || classId}
            </TableCell>
            {columns.map((c) => (
              <TableCell key={c.seq} sx={cellSx}>
                {cellText(classId, c.seq)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Legend({ legend }) {
  if (legend.length === 0) return null;
  return (
    <Box sx={{ mt: 1 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 12, mb: 0.5 }}>
        Teacher codes
      </Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
        {legend.map(([code, name]) => (
          <Typography key={code} sx={{ fontSize: 11, color: "#555", mr: 2 }}>
            <b>{code}</b> = {name}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

export default function MasterTimetable({
  config,
  entries = [],
  title = "Master Timetable",
  subtitle = "",
}) {
  const { canPrint } = useTimetablePerms();
  const [classNameById, setClassNameById] = useState({});
  const [teacherMap, setTeacherMap] = useState(new Map());
  const [printing, setPrinting] = useState(false);

  // Teaching/active days in order; each carries its own slots.
  const days = useMemo(
    () =>
      [...(config?.days || [])]
        .filter((d) => (d.slots || []).length > 0)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    [config],
  );
  const [selectedDay, setSelectedDay] = useState(null);
  useEffect(() => {
    if (days.length > 0)
      setSelectedDay((prev) =>
        days.some((d) => d.dayOfWeek === prev) ? prev : days[0].dayOfWeek,
      );
  }, [days]);

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

  // seq -> slot, per day (for column lookups).
  const slotBySeqByDay = useMemo(() => {
    const m = new Map();
    for (const d of days) {
      const inner = new Map();
      for (const s of d.slots || []) inner.set(s.sequence, s);
      m.set(d.dayOfWeek, inner);
    }
    return m;
  }, [days]);

  const legend = useMemo(() => {
    const seen = new Map();
    for (const e of entries) {
      if (!e.teacherId) continue;
      const t = teacherMap.get(e.teacherId);
      if (t?.code && !seen.has(t.code)) seen.set(t.code, t.name);
    }
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries, teacherMap]);

  const dayObj = days.find((d) => d.dayOfWeek === selectedDay) || days[0];
  const common = {
    classRows: sortedClassIds,
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
          label="Day"
          value={selectedDay ?? ""}
          onChange={(e) => setSelectedDay(Number(e.target.value))}
          sx={{ width: 160 }}
        >
          {days.map((d) => (
            <MenuItem key={d.dayOfWeek} value={d.dayOfWeek}>
              {DOW_FULL[d.dayOfWeek] || d.dayOfWeek}
            </MenuItem>
          ))}
        </TextField>
        {canPrint && (
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() => setPrinting(true)}
          >
            Print Master (all days)
          </Button>
        )}
        <Typography variant="caption" sx={{ color: "#8f9bb3" }}>
          One A4 landscape sheet per day.
        </Typography>
      </Stack>

      {/* On-screen: the selected day. */}
      {dayObj && (
        <Paper variant="outlined" sx={{ overflowX: "auto", p: 1 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>
            {DOW_FULL[dayObj.dayOfWeek]}
          </Typography>
          <DayGrid
            {...common}
            day={dayObj}
            columns={dayColumns(dayObj)}
            slotBySeq={slotBySeqByDay.get(dayObj.dayOfWeek) || new Map()}
          />
          <Legend legend={legend} />
        </Paper>
      )}

      {/* Printable: one page per day, then a legend page. */}
      <PrintLayer open={printing} onClose={() => setPrinting(false)}>
        <Box>
          {days.map((d) => (
            <Box key={d.dayOfWeek} className="print-page">
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
                sx={{ mb: 0.5 }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                  {title} — {DOW_FULL[d.dayOfWeek]}
                </Typography>
                {subtitle && (
                  <Typography sx={{ fontSize: 10, color: "#555" }}>
                    {subtitle}
                  </Typography>
                )}
              </Stack>
              <DayGrid
                {...common}
                day={d}
                columns={dayColumns(d)}
                slotBySeq={slotBySeqByDay.get(d.dayOfWeek) || new Map()}
              />
            </Box>
          ))}
          <Box className="print-page">
            <Legend legend={legend} />
          </Box>
        </Box>
      </PrintLayer>
    </Box>
  );
}
