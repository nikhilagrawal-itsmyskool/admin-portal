import { assemblyService } from '../../services/assemblyService';

const iso = (d) => d.toISOString().slice(0, 10);
export const mondayOf = (d) => {
  const x = new Date(d); const dow = x.getUTCDay();
  x.setUTCDate(x.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return iso(x);
};
export const todayIso = () => iso(new Date());
export const addWeeks = (s, n) => { const x = new Date(`${s}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n * 7); return iso(x); };

// The logged-in teacher's own-house roster duties over this week + the next N weeks
// (default 4 → a 5-week window). Sorted earliest first. Weeks that don't exist yet
// come back without a weekId (the editor ensures them on open).
export async function resolveMyRosterWeeks(weeksAhead = 4) {
  const thisMon = mondayOf(new Date());
  const to = addWeeks(thisMon, weeksAhead);
  const d = await assemblyService.myDuties({ from: thisMon, to });
  const duties = (d.rosterDuties || []).slice().sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return { duties, isHouseMember: d.isHouseMember };
}

// Resolve THIS week's roster duty for the logged-in teacher (single-wing: take the
// first). Auto-starts the week if it doesn't exist yet. Returns { weekId } or
// { reason } when the teacher's house isn't on duty this week.
export async function resolveMyRosterWeek() {
  const thisMon = mondayOf(new Date());
  const d = await assemblyService.myDuties({ from: thisMon, to: thisMon });
  const duty = (d.rosterDuties || [])[0];
  if (!duty) return { reason: 'Your house is not on duty this week.' };
  let weekId = duty.weekId;
  if (!weekId) weekId = (await assemblyService.myEnsureWeek(duty.planId, duty.weekStart)).uuid;
  return { weekId, houseName: duty.houseName, weekStart: duty.weekStart };
}

// Resolve THIS week's week to grade for an evaluator (single-wing: first). Returns
// { weekId } or { reason } when the teacher isn't an evaluator / nothing to grade.
export async function resolveMyGradingWeek() {
  const thisMon = mondayOf(new Date());
  const d = await assemblyService.myDuties({ from: thisMon, to: thisMon });
  if (!d.isEvaluator) return { reason: 'You are not an assembly evaluator.' };
  const gw = (d.gradingWeeks || [])[0];
  if (!gw) return { reason: 'No assembly assigned to you to grade this week.' };
  return { weekId: gw.weekId, houseName: gw.houseName, weekStart: gw.weekStart };
}
