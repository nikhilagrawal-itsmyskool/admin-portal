import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Alert, CircularProgress,
  Select, MenuItem, Button, Chip, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, Tab, Tooltip, Snackbar, Link,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { studentService } from '../../../services/studentService';
import { useAcademicYear } from '../../../context/AcademicYearContext';
import { useCan } from '../../../permissions/can';
import { ACTIONS } from '../../../permissions/actions';

const FALLBACK_COLORS = ['#c77d0a', '#0e7c86', '#6d5bd0', '#c0392b', '#2f8a5b', '#b9821b', '#8a5cf6', '#0f766e'];
const BOYS = '#3d6fb4';
const GIRLS = '#c65b8a';

const houseColor = (h, i) => h.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
const round = (n) => Math.round(n);

// A small labelled info icon with a hover tooltip.
function Info({ text }) {
  return (
    <Tooltip title={text} arrow enterTouchDelay={0}>
      <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'help', verticalAlign: 'middle' }} />
    </Tooltip>
  );
}

function StatusChip({ kind, label }) {
  const color = kind === 'good' ? 'success' : kind === 'warn' ? 'warning' : 'error';
  return <Chip size="small" color={color} label={label} sx={{ ml: 'auto', fontWeight: 700, height: 22 }} />;
}

function PanelHead({ title, info, status }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
      <Info text={info} />
      {status && <StatusChip kind={status.kind} label={status.label} />}
    </Box>
  );
}

export default function HouseBalance({ onGoManage }) {
  const { academicYearId } = useAcademicYear();
  const can = useCan();
  const canManage = can(ACTIONS.STUDENT_MANAGE);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anomalyTab, setAnomalyTab] = useState(0);
  const [selected, setSelected] = useState({});   // studentId -> chosen houseId (unassigned)
  const [savingId, setSavingId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await studentService.getHouseAnalytics(academicYearId);
      setData(res);
      const seed = {};
      (res.unassigned || []).forEach((u) => { seed[u.uuid] = u.suggestedHouseId || (res.houses[0] && res.houses[0].uuid) || ''; });
      setSelected(seed);
    } catch {
      setError('Failed to load house balance');
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => { load(); }, [load]);

  const houseName = useMemo(() => {
    const m = {};
    (data?.houses || []).forEach((h) => (m[h.uuid] = h.name));
    return m;
  }, [data]);
  const colorFor = useMemo(() => {
    const m = {};
    (data?.houses || []).forEach((h, i) => (m[h.uuid] = houseColor(h, i)));
    return m;
  }, [data]);

  const assign = async (studentId, houseId) => {
    if (!houseId) return;
    setSavingId(studentId);
    try {
      await studentService.assignHouse(studentId, houseId);
      setToast('House assigned');
      await load();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to assign house');
    } finally {
      setSavingId(null);
    }
  };

  const assignAllSuggested = async () => {
    if (!data?.unassigned?.length) return;
    setBulkSaving(true);
    try {
      for (const u of data.unassigned) {
        const hid = selected[u.uuid] || u.suggestedHouseId;
        if (hid) await studentService.assignHouse(u.uuid, hid);
      }
      setToast('All students assigned');
      await load();
    } catch (e) {
      setError(e?.response?.data?.error?.message || 'Failed to assign some students');
    } finally {
      setBulkSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }
  if (error && !data) {
    return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
  }
  if (!data || !data.summary || !(data.houses || []).length) {
    return (
      <Alert severity="info" sx={{ my: 2 }}>
        No houses or no students on roll for this year yet. Create houses under the{' '}
        <Link component="button" onClick={onGoManage}>Manage</Link> tab, then assign students.
      </Alert>
    );
  }

  const { summary, houses, grades, unassigned, siblingsClustered } = data;
  const genderTotal = summary.boys + summary.girls;
  const boyFrac = genderTotal ? summary.boys / genderTotal : 0.5;
  const girlFrac = 1 - boyFrac;
  const idealSize = summary.assigned / houses.length;
  const maxTotal = Math.max(...houses.map((h) => h.total), 1);
  const noColours = houses.some((h) => !h.color);

  // ---- statuses ----
  const maxAbsDelta = Math.max(...houses.map((h) => Math.abs(h.total - idealSize)));
  const sizeStatus = maxAbsDelta <= idealSize * 0.08
    ? { kind: 'good', label: 'Balanced' }
    : maxAbsDelta <= idealSize * 0.15 ? { kind: 'warn', label: 'Slightly uneven' } : { kind: 'crit', label: 'Uneven' };

  const girlShortById = {};
  houses.forEach((h) => (girlShortById[h.uuid] = round(h.total * girlFrac - h.girls)));
  const worstGirl = houses.reduce((w, h) => (Math.abs(girlShortById[h.uuid]) > Math.abs(girlShortById[w.uuid] ?? -Infinity) ? h : w), houses[0]);
  const worstGirlShort = girlShortById[worstGirl.uuid];
  const genderStatus = Math.abs(worstGirlShort) < 5
    ? { kind: 'good', label: 'Balanced' }
    : Math.abs(worstGirlShort) < 10 ? { kind: 'warn', label: '1 house off' } : { kind: 'crit', label: 'Skewed' };

  const gradeStatus = summary.unassigned > 0
    ? { kind: 'warn', label: 'Some unassigned' }
    : { kind: 'good', label: 'Balanced' };

  const KPIS = [
    { n: summary.onRoll, l: 'On roll', s: 'Active students this year' },
    { n: summary.assigned, l: 'In a house', s: `${Math.round((summary.assigned / summary.onRoll) * 100)}% of students` },
    { n: summary.unassigned, l: 'Need a house', s: 'No house yet', flag: summary.unassigned > 0 },
    { n: summary.familiesClustered, l: 'Families to split', s: 'Siblings sharing one house' },
  ];

  const pill = (v) => (v === 0 ? 'even' : v > 0 ? `+${v}` : `${v}`);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {noColours && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Some houses have no colour set — the charts read better with one.{' '}
          <Link component="button" onClick={onGoManage}>Set colours</Link>
        </Alert>
      )}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        {KPIS.map((k) => (
          <Grid item xs={6} md={3} key={k.l}>
            <Card variant="outlined" sx={k.flag ? { borderColor: 'error.main' } : undefined}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" sx={{ fontWeight: 650, color: k.flag ? 'error.main' : 'text.primary', lineHeight: 1.1 }}>
                  {k.n}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.25 }}>{k.l}</Typography>
                <Typography variant="caption" color="text.secondary">{k.s}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0 }}>
        {/* House size */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <PanelHead
                title="House size"
                status={sizeStatus}
                info="Goal: each house holds about the same number of students (a quarter of those assigned). The marker on each bar is that even target; the number on the right is how many above or below it this house is."
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 20 }}>
                Largest and smallest houses are {maxTotal - Math.min(...houses.map((h) => h.total))} students apart.
                &nbsp;<em>Bars should all reach the marker.</em>
              </Typography>
              {houses.map((h, i) => {
                const d = round(h.total - idealSize);
                return (
                  <Box key={h.uuid} sx={{ display: 'grid', gridTemplateColumns: '96px 1fr 78px', alignItems: 'center', gap: 1.5, my: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 13.5, fontWeight: 600 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: colorFor[h.uuid] }} />
                      <span>{h.name}</span>
                    </Box>
                    <Box sx={{ position: 'relative', height: 24, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                      <Box sx={{ position: 'absolute', inset: '0 auto 0 0', width: `${(h.total / maxTotal) * 100}%`, bgcolor: colorFor[h.uuid], borderRadius: '5px 0 0 5px' }} />
                      <Box sx={{ position: 'absolute', top: -4, bottom: -4, left: `${(idealSize / maxTotal) * 100}%`, width: '2px', bgcolor: 'text.primary', opacity: 0.5 }} />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 30px', columnGap: 0.75, alignItems: 'baseline', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                      <Box sx={{ justifySelf: 'end', fontWeight: 650 }}>{h.total}</Box>
                      <Box sx={{ justifySelf: 'end', fontSize: 11.5, color: d > 0 ? 'success.main' : d < 0 ? 'error.main' : 'text.disabled' }}>{pill(d)}</Box>
                    </Box>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>

        {/* Gender */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <PanelHead
                title="Boys & girls per house"
                status={genderStatus}
                info={`Goal: every house should have the same boy:girl ratio as the school (${Math.round(boyFrac * 100)}% boys). The vertical marker is that school ratio — a house whose boys segment ends past the marker is boy-heavy. The number on the right is how many girls short (or over) that house is.`}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 20 }}>
                {Math.abs(worstGirlShort) >= 5
                  ? <><strong>{worstGirl.name}</strong> runs boy-heavy — about {Math.abs(worstGirlShort)} {worstGirlShort > 0 ? 'girls short of' : 'girls over'} an even mix.</>
                  : <>Every house mirrors the school split within a few students.</>}
                &nbsp;<em>The split should end at the marker in every house.</em>
              </Typography>
              {houses.map((h) => {
                const bp = h.total ? (h.boys / h.total) * 100 : 0;
                const gs = girlShortById[h.uuid];
                const off = Math.abs(gs) >= 5;
                return (
                  <Box key={h.uuid} sx={{ display: 'grid', gridTemplateColumns: '96px 1fr 66px', alignItems: 'center', gap: 1.5, my: 1.25 }}>
                    <Box sx={{ fontSize: 13.5, fontWeight: 600 }}>{h.name}</Box>
                    <Box sx={{ position: 'relative', height: 24, display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                      <Box sx={{ width: `${bp}%`, bgcolor: BOYS, display: 'flex', alignItems: 'center', px: 1, color: '#fff', fontSize: 11.5, fontWeight: 650 }}>{h.boys}</Box>
                      <Box sx={{ width: `${100 - bp}%`, bgcolor: GIRLS, display: 'flex', alignItems: 'center', px: 1, color: '#fff', fontSize: 11.5, fontWeight: 650 }}>{h.girls}</Box>
                      <Box sx={{ position: 'absolute', top: -4, bottom: -4, left: `${boyFrac * 100}%`, width: '2px', bgcolor: 'text.primary', opacity: 0.6 }} />
                    </Box>
                    <Box sx={{ fontSize: 11.5, textAlign: 'right', color: off ? 'error.main' : 'text.disabled', fontWeight: off ? 600 : 400 }}>
                      {gs > 0 ? `${gs} short` : gs < 0 ? `${-gs} over` : 'even'}
                    </Box>
                  </Box>
                );
              })}
              <Box sx={{ display: 'flex', gap: 2, mt: 1.5, fontSize: 12, color: 'text.secondary', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}><Box sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: BOYS }} />Boys</Box>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}><Box sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: GIRLS }} />Girls</Box>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}><Box sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: 'text.primary', opacity: 0.6 }} />School ratio</Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Grade x House */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <PanelHead
                title="Every grade, split across houses"
                status={gradeStatus}
                info="Goal: within a single grade, the four houses should each get about a quarter — so no house stockpiles a grade. Each bar is one grade; the coloured bands should look roughly equal. A striped band = students in that grade not yet in any house."
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                In each grade the house colours should be near-equal. A striped block means that grade still needs assigning.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap', fontSize: 12, color: 'text.secondary' }}>
                {houses.map((h) => (
                  <Box key={h.uuid} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 11, height: 11, borderRadius: '3px', bgcolor: colorFor[h.uuid] }} />{h.name}
                  </Box>
                ))}
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 11, height: 11, borderRadius: '3px', background: 'repeating-linear-gradient(45deg,#bbb,#bbb 3px,transparent 3px,transparent 6px)' }} />No house
                </Box>
              </Box>
              {grades.map((g) => (
                <Box key={g.grade} sx={{ display: 'grid', gridTemplateColumns: '64px 1fr 40px', alignItems: 'center', gap: 1.5, my: 0.75 }}>
                  <Box sx={{ fontSize: 13, fontWeight: 600 }}>{g.grade}</Box>
                  <Box sx={{ position: 'relative', height: 26, display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', bgcolor: 'action.hover' }}>
                    {g.counts.map((c) => (
                      c.n > 0 ? (
                        <Tooltip key={c.houseId} title={`${houseName[c.houseId]}: ${c.n}`} arrow>
                          <Box sx={{ width: `${(c.n / g.total) * 100}%`, bgcolor: colorFor[c.houseId], borderRight: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 650 }}>
                            {c.n >= g.total * 0.06 ? c.n : ''}
                          </Box>
                        </Tooltip>
                      ) : null
                    ))}
                    {g.none > 0 && (
                      <Tooltip title={`No house: ${g.none}`} arrow>
                        <Box sx={{ width: `${(g.none / g.total) * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'error.main', fontSize: 11, fontWeight: 700, background: 'repeating-linear-gradient(45deg,rgba(192,57,43,.25),rgba(192,57,43,.25) 5px,transparent 5px,transparent 10px)' }}>
                          {g.none}
                        </Box>
                      </Tooltip>
                    )}
                    {[25, 50, 75].map((q) => (
                      <Box key={q} sx={{ position: 'absolute', top: 0, bottom: 0, left: `${q}%`, width: '1px', bgcolor: 'rgba(255,255,255,.5)' }} />
                    ))}
                  </Box>
                  <Box sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{g.total}</Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Anomalies */}
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Tabs value={anomalyTab} onChange={(_e, v) => setAnomalyTab(v)} sx={{ mb: 2, minHeight: 40 }}>
                <Tab sx={{ minHeight: 40 }} label={`Needs a house (${unassigned.length})`} />
                <Tab sx={{ minHeight: 40 }} label={`Siblings together (${siblingsClustered.length})`} />
              </Tabs>

              {anomalyTab === 0 && (
                unassigned.length === 0 ? (
                  <Alert severity="success">Every student on roll has a house. 🎉</Alert>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                      <Alert severity="warning" sx={{ flex: 1, minWidth: 240, py: 0 }}>
                        The pre-selected house for each student keeps their grade and gender even. Review, then assign.
                      </Alert>
                      {canManage && (
                        <Button variant="contained" onClick={assignAllSuggested} disabled={bulkSaving}>
                          {bulkSaving ? 'Assigning…' : 'Assign all suggested'}
                        </Button>
                      )}
                    </Box>
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Student</TableCell>
                            <TableCell>Class</TableCell>
                            <TableCell>Gender</TableCell>
                            <TableCell>Assign to house</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {unassigned.map((u) => (
                            <TableRow key={u.uuid}>
                              <TableCell>{u.name}</TableCell>
                              <TableCell>{u.className}</TableCell>
                              <TableCell>
                                <Chip size="small" label={u.gender === 'M' ? 'Boy' : u.gender === 'F' ? 'Girl' : '—'} />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Select
                                    size="small"
                                    value={selected[u.uuid] || ''}
                                    onChange={(e) => setSelected((s) => ({ ...s, [u.uuid]: e.target.value }))}
                                    disabled={!canManage}
                                    sx={{ minWidth: 150 }}
                                  >
                                    {houses.map((h) => (
                                      <MenuItem key={h.uuid} value={h.uuid}>{h.name}</MenuItem>
                                    ))}
                                  </Select>
                                  {canManage && (
                                    <Button size="small" variant="outlined" disabled={savingId === u.uuid}
                                      onClick={() => assign(u.uuid, selected[u.uuid])}>
                                      {savingId === u.uuid ? '…' : 'Assign'}
                                    </Button>
                                  )}
                                  {selected[u.uuid] === u.suggestedHouseId && (
                                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>✓ keeps balance</Typography>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </>
                )
              )}

              {anomalyTab === 1 && (
                siblingsClustered.length === 0 ? (
                  <Alert severity="success">No families have all their children in one house.</Alert>
                ) : (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      These families have every child in the <strong>same</strong> house. Your rule is siblings in different
                      houses (families of 5+ are exempt), so move one child to a different house to split them.
                    </Alert>
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Family — all in one house</TableCell>
                            <TableCell>Move a child</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {siblingsClustered.map((f) => (
                            <TableRow key={f.familyKey}>
                              <TableCell sx={{ verticalAlign: 'top', py: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: colorFor[f.houseId] }} />
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.houseName}</Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                  {f.members.map((m) => `${m.name} (${m.className})`).join(' · ')}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ verticalAlign: 'top', py: 1.5 }}>
                                {f.members.map((m) => (
                                  <Box key={m.uuid} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                    <Typography variant="body2" sx={{ minWidth: 150 }}>{m.name}</Typography>
                                    <Select
                                      size="small"
                                      value={f.houseId}
                                      disabled={!canManage || savingId === m.uuid}
                                      onChange={(e) => assign(m.uuid, e.target.value)}
                                      sx={{ minWidth: 150 }}
                                    >
                                      {houses.map((h) => (
                                        <MenuItem key={h.uuid} value={h.uuid}>{h.name}</MenuItem>
                                      ))}
                                    </Select>
                                  </Box>
                                ))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  </>
                )
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast('')} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}
