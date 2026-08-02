// Single source of truth for how modules are grouped in the desktop sidebar and the
// Dashboard tile grid. Titles must match the `title` used in Sidebar.jsx `menuItems`
// and Dashboard.jsx `modules`. Items are ordered alphabetically within each group.
// (The mobile menu uses its own model in src/mobile/mobileFeatures.js — not this.)
export const MODULE_GROUPS = [
  { key: 'people', label: 'People & Staff', titles: ['Assistant', 'Employees', 'Hiring', 'Students', 'Transfer Certs'] },
  { key: 'academics', label: 'Academics', titles: ['Assembly', 'Homework', 'Library', 'Syllabus', 'Timetable'] },
  { key: 'operations', label: 'Operations', titles: ['Attendance', 'Communication', 'Fees', 'Fines', 'Transport'] },
  { key: 'stores', label: 'Stores & Inventory', titles: ['Assets', 'Laboratory', 'Medical', 'Shop', 'Sports', 'Supplies', 'Uniform'] },
];

// Group a list of { title, ... } items into ordered groups. Within each group items follow
// the group's declared (alphabetical) title order; titles not in any group collect into a
// trailing unlabelled `other` group so nothing is ever dropped when a module is added later.
// Returns [{ key, label, items }] with empty groups omitted.
export function groupByModule(items) {
  const byTitle = new Map(items.map((it) => [it.title, it]));
  const used = new Set();
  const groups = MODULE_GROUPS.map((g) => {
    const groupItems = g.titles
      .map((t) => byTitle.get(t))
      .filter(Boolean);
    groupItems.forEach((it) => used.add(it.title));
    return { key: g.key, label: g.label, items: groupItems };
  }).filter((g) => g.items.length > 0);

  const leftovers = items.filter((it) => !used.has(it.title));
  if (leftovers.length) groups.push({ key: 'other', label: null, items: leftovers });
  return groups;
}
