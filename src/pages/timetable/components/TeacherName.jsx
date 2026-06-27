import React, { useState, useEffect } from "react";
import { getCached, resolveTeacher } from "./teacherDirectory";

// Renders a teacher's full name from their employee id, via the shared teacher
// directory cache (so name + code resolve once across the whole timetable UI).
export default function TeacherName({ id }) {
  const [name, setName] = useState(() => getCached(id)?.name || null);

  useEffect(() => {
    let active = true;
    if (!id) return;
    const cached = getCached(id);
    if (cached) {
      setName(cached.name);
      return;
    }
    resolveTeacher(id).then((t) => {
      if (active) setName(t.name);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (!id) return <>—</>; // teacher-less period (e.g. supervised study)
  return <>{name || id}</>;
}
