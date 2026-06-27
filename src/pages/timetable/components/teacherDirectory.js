import { employeeService } from "../../../services/employeeService";

// Shared module-level cache resolving a teacher (employee) id to { name, code }.
// `code` is the school-managed short code (employee.code); when blank we fall back
// to derived initials so the master timetable is usable before codes are populated.
const cache = new Map(); // id -> { name, code }
const inflight = new Map(); // id -> Promise

// "Itsmyskool Admin" -> "IA"; "Ramesh" -> "RAM". Used only when employee.code is blank.
export function deriveInitials(name) {
  if (!name) return "";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts
    .map((p) => p[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

export function getCached(id) {
  return id ? cache.get(id) : undefined;
}

export async function resolveTeacher(id) {
  if (!id) return { name: "", code: "" };
  if (cache.has(id)) return cache.get(id);
  if (inflight.has(id)) return inflight.get(id);
  const p = employeeService
    .getEmployee(id)
    .then((data) => {
      const emp = data?.employee || data || {};
      const name = emp.name || id;
      const code =
        (emp.code && String(emp.code).trim()) || deriveInitials(name);
      const entry = { name, code };
      cache.set(id, entry);
      inflight.delete(id);
      return entry;
    })
    .catch(() => {
      const entry = { name: id, code: deriveInitials(id) };
      cache.set(id, entry);
      inflight.delete(id);
      return entry;
    });
  inflight.set(id, p);
  return p;
}

// Resolve many ids at once; returns a Map(id -> { name, code }).
export async function resolveTeachers(ids) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  await Promise.all(unique.map((id) => resolveTeacher(id)));
  const map = new Map();
  for (const id of unique)
    map.set(id, cache.get(id) || { name: id, code: deriveInitials(id) });
  return map;
}
