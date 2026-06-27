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
import TeacherName from "./TeacherName";
import PrintLayer from "./PrintLayer";
import { resolveTeacher, getCached } from "./teacherDirectory";
import { classService } from "../../../services/classService";

// Toggle between per-class and per-teacher grid views over a set of entries.
export default function GridViewer({ config, entries = [], printHeader = "" }) {
  const [mode, setMode] = useState("class");
  const [selectedId, setSelectedId] = useState("");
  const [classNameById, setClassNameById] = useState({});
  const [printing, setPrinting] = useState(false);
  const [printTitle, setPrintTitle] = useState("");

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

  const classIds = useMemo(
    () => [...new Set(entries.map((e) => e.classId))],
    [entries],
  );
  const teacherIds = useMemo(
    () => [...new Set(entries.map((e) => e.teacherId))],
    [entries],
  );
  const options = mode === "class" ? classIds : teacherIds;

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
      label = `Class ${classNameById[selectedId] || selectedId}`;
    } else {
      const t = getCached(selectedId) || (await resolveTeacher(selectedId));
      label = t?.name || selectedId;
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
        </ToggleButtonGroup>
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
              {mode === "class" ? (
                classNameById[id] || id
              ) : (
                <TeacherName id={id} />
              )}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PrintIcon />}
          disabled={!selectedId}
          onClick={startPrint}
        >
          Print
        </Button>
      </Stack>
      <TimetableGrid
        config={config}
        entries={entries}
        mode={mode}
        selectedId={selectedId}
        classNameById={classNameById}
      />

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
            classNameById={classNameById}
          />
        </Box>
      </PrintLayer>
    </Box>
  );
}
