import React, { useState, useEffect } from 'react';
import { employeeService } from '../../../services/employeeService';

// Module-level cache so repeated teacher ids resolve once.
const cache = new Map();

export default function TeacherName({ id }) {
  const [name, setName] = useState(id && cache.has(id) ? cache.get(id) : null);

  useEffect(() => {
    let active = true;
    if (!id) return;
    if (cache.has(id)) { setName(cache.get(id)); return; }
    employeeService.getEmployee(id)
      .then((data) => {
        const n = data?.name || data?.employee?.name || id;
        cache.set(id, n);
        if (active) setName(n);
      })
      .catch(() => { cache.set(id, id); if (active) setName(id); });
    return () => { active = false; };
  }, [id]);

  if (!id) return <>—</>; // teacher-less period (e.g. supervised study)
  return <>{name || id}</>;
}
