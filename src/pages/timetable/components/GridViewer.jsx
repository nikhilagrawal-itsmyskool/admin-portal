import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  MenuItem,
  Stack,
  Button,
  Typography,
} from "@mui/material";
import { Print as PrintIcon } from "@mui/icons-material";
import TimetableGrid from "./TimetableGrid";
import MasterTimetable from "./MasterTimetable";
import TeacherName from "./TeacherName";
import PrintLayer from "./PrintLayer";
import { resolveTeacher, getCached, resolveTeachers } from "./teacherDirectory";
import { useTimetablePerms } from "./usePerms";
import { classService } from "../../../services/classService";

// "Name (CODE)" when a code exists, else just the name/id.
const withCode = (name, code) => (code ? `${name} (${code})` : name || "");

// Toggle between per-class and per-teacher grid views over a set of entries.
export default function GridViewer({ config, entries = [], printHeader = "" }) {
  const { canPrint } = useTimetablePerms();
  const [mode, setMode] = useState("class");
  const [selectedId, setSelectedId] = useState("");
  const [classById, setClassById] = useState({}); // uuid -> { name, code }
  const [classRank, setClassRank] = useState({}); // uuid -> canonical order index
  const [teacherById, setTeacherById] = useState({}); // id -> { name, code }
  const [printing, setPrinting] = useState(false);
  const [printTitle, setPrintTitle] = useState("");

  useEffect(() => {
    classService
      .getClasses()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.classes || [];
        const map = {};
        const rank = {};
        // Preserve the API's canonical order (seq asc, then name) so the Class
        // dropdown matches every other screen instead of entry-emission order.
        list.forEach((c, i) => {
          map[c.uuid] = { name: c.name, code: c.code };
          rank[c.uuid] = i;
        });
        setClassById(map);
        setClassRank(rank);
      })
      .catch(() => {});
  }, []);

  // Resolve every teacher in the entries to { name, code } for the cells.
  useEffect(() => {
    const ids = [...new Set(entries.map((e) => e.teacherId).filter(Boolean))];
    if (ids.length === 0) {
      setTeacherById({});
      return;
    }
    resolveTeachers(ids).then((m) => setTeacherById(Object.fromEntries(m)));
  }, [entries]);

  // Dropdown options must be stably ordered — entries come out in solver-emission
  // order (which changed with CP-SAT), so sort here rather than rely on that order.
  // Classes follow the canonical API order (classRank); teachers sort by name.
  const classIds = useMemo(() => {
    const ids = [...new Set(entries.map((e) => e.classId))];
    return ids.sort((a, b) => {
      const ra = classRank[a] ?? Infinity;
      const rb = classRank[b] ?? Infinity;
      if (ra !== rb) return ra - rb;
      return (classById[a]?.name || a).localeCompare(
        classById[b]?.name || b,
        undefined,
        { numeric: true },
      );
    });
  }, [entries, classRank, classById]);
  const teacherIds = useMemo(() => {
    const ids = [...new Set(entries.map((e) => e.teacherId).filter(Boolean))];
    return ids.sort((a, b) =>
      (teacherById[a]?.name || a).localeCompare(
        teacherById[b]?.name || b,
        undefined,
        { numeric: true },
      ),
    );
  }, [entries, teacherById]);
  const options = mode === "class" ? classIds : teacherIds;
  const classLabel = (id) =>
    withCode(classById[id]?.name || id, classById[id]?.code);

  useEffect(() => {
    if (options.length > 0 && !options.includes(selectedId))
      setSelectedId(options[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, entries]);

  // Resolve a human label for the current selection, then open the print layer.
  const startPrint = async () => {
    if (!selectedId) return;
    let label;
    if (mode === "class") {
      label = `Class ${classLabel(selectedId)}`;
    } else {
      const t = getCached(selectedId) || (await resolveTeacher(selectedId));
      label = withCode(t?.name || selectedId, t?.code);
    }
    setPrintTitle(label);
    setPrinting(true);
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2 }}
        alignItems="center"
        className="no-print"
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(e, v) => {
            if (v) setSelectedId("");
            if (v) setMode(v);
          }}
        >
          <ToggleButton value="class">By Class</ToggleButton>
          <ToggleButton value="teacher">By Teacher</ToggleButton>
          <ToggleButton value="master">Master</ToggleButton>
        </ToggleButtonGroup>
        {mode !== "master" && (
          <TextField
            select
            size="small"
            label={mode === "class" ? "Class" : "Teacher"}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            sx={{ minWidth: 240 }}
          >
            {options.length === 0 && (
              <MenuItem value="" disabled>
                None
              </MenuItem>
            )}
            {options.map((id) => (
              <MenuItem key={id} value={id}>
                {mode === "class" ? classLabel(id) : <TeacherName id={id} />}
              </MenuItem>
            ))}
          </TextField>
        )}
        {/* Master mode has its own Day picker + Print inside MasterTimetable. */}
        {mode !== "master" && canPrint && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            disabled={!selectedId}
            onClick={startPrint}
          >
            Print
          </Button>
        )}
      </Stack>
      {mode === "master" ? (
        <MasterTimetable config={config} entries={entries} />
      ) : (
        <TimetableGrid
          config={config}
          entries={entries}
          mode={mode}
          selectedId={selectedId}
          classById={classById}
          teacherById={teacherById}
        />
      )}

      <PrintLayer open={printing} onClose={() => setPrinting(false)}>
        <Box className="print-page" sx={{ p: 1 }}>
          {printHeader && (
            <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
              {printHeader}
            </Typography>
          )}
          <Typography sx={{ fontWeight: 700, fontSize: 16, mb: 1 }}>
            {mode === "class" ? "Class Timetable" : "Teacher Timetable"} —{" "}
            {printTitle}
          </Typography>
          <TimetableGrid
            config={config}
            entries={entries}
            mode={mode}
            selectedId={selectedId}
            classById={classById}
            teacherById={teacherById}
          />
        </Box>
      </PrintLayer>
    </Box>
  );
}
