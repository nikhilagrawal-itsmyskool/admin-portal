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
//
// Does ONE /employees/search to populate the cache for every requested id at once,
// instead of firing N per-id /employees/{id} calls. The old per-id fan-out (e.g. 33
// parallel requests for a full timetable grid) overwhelmed the DB connections and
// caused intermittent 500s, leaving teachers unresolved. Falls back to per-id lookup
// only for ids the bulk search didn't return.
export async function resolveTeachers(ids) {
  const unique = [...new Set((ids || []).filter(Boolean))];

  if (unique.some((id) => !cache.has(id))) {
    try {
      const list = await employeeService.searchEmployees({});
      const arr = Array.isArray(list) ? list : list?.employees || list?.data || [];
      for (const emp of arr) {
        if (!emp || !emp.uuid) continue;
        const name = emp.name || emp.uuid;
        const code = (emp.code && String(emp.code).trim()) || deriveInitials(name);
        cache.set(emp.uuid, { name, code });
      }
    } catch {
      // Bulk fetch failed — fall through to per-id resolution below.
    }
  }

  const stillMissing = unique.filter((id) => !cache.has(id));
  if (stillMissing.length)
    await Promise.all(stillMissing.map((id) => resolveTeacher(id)));

  const map = new Map();
  for (const id of unique)
    map.set(id, cache.get(id) || { name: id, code: deriveInitials(id) });
  return map;
}
