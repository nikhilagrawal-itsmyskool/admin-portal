import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button, Alert, Stack, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Divider, Drawer, IconButton,
  Accordion, AccordionSummary, AccordionDetails, CircularProgress,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon, Insights as RationaleIcon, Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { assemblyService } from '../../services/assemblyService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useCan } from '../../permissions/can';
import { fmtDate, fmtDateDow } from '../../utils/date';

const iso = (d) => d.toISOString().slice(0, 10);
const firstOfMonth = () => { const d = new Date(); return iso(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))); };
const lastOfMonth = () => { const d = new Date(); return iso(new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0))); };
const round2 = (n) => Math.round(n * 100) / 100;
const mean = (arr) => (arr.length ? round2(arr.reduce((s, n) => s + n, 0) / arr.length) : 0);

// The God/Admin-only breakup: how a house's average is derived — week → day → each
// evaluator's marks. Lazily loads every week's grades (all evaluators) + the rubric
// (for metric names). Averages are unweighted means at each level (matches the backend).
function RationaleDrawer({ house, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rubric, setRubric] = useState({ metrics: [], penalties: [] });
  const [gradesByWeek, setGradesByWeek] = useState({}); // weekId -> GradeView[]

  useEffect(() => {
    if (!house) return undefined;
    let alive = true;
    setLoading(true); setError('');
    (async () => {
      try {
        const [rb, ...weekGrades] = await Promise.all([
          assemblyService.getRubric(),
          ...(house.weeks || []).map((w) => assemblyService.getWeekGrades(w.weekId)),
        ]);
        if (!alive) return;
        setRubric(rb || { metrics: [], penalties: [] });
        const map = {};
        (house.weeks || []).forEach((w, i) => { map[w.weekId] = weekGrades[i] || []; });
        setGradesByWeek(map);
      } catch (err) { if (alive) setError(err.response?.data?.error?.description || 'Failed to load the breakup'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [house]);

  const metricName = (id) => rubric.metrics.find((m) => m.uuid === id)?.name || 'Metric';
  const penaltyName = (id) => { const p = rubric.penalties.find((x) => x.uuid === id); return p ? `${p.name} (−${p.value})` : 'Penalty'; };

  return (
    <Drawer anchor="right" open={!!house} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, maxWidth: '100%' } }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="overline" color="text.secondary">How the average is derived</Typography>
            <Typography variant="h6">{house?.houseName || 'House'}</Typography>
          </Box>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          House average <strong>{house?.average}</strong> = mean of {house?.weeks?.length || 0} week average(s).
          Each week = mean of its day scores; each day = mean of that day's evaluator totals.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : (
          (house?.weeks || []).map((w) => {
            const grades = gradesByWeek[w.weekId] || [];
            const byDate = {};
            grades.forEach((g) => { (byDate[g.gradeDate] = byDate[g.gradeDate] || []).push(g); });
            const dates = Object.keys(byDate).sort();
            return (
              <Box key={w.weekId} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Typography variant="subtitle2">Week of {fmtDate(w.weekStart)}</Typography>
                  <Chip size="small" color="primary" variant="outlined" label={`avg ${w.average}`} />
                </Stack>
                {dates.length === 0 && <Typography variant="caption" color="text.secondary">No grades recorded.</Typography>}
                {dates.map((d) => {
                  const dayGrades = byDate[d];
                  const dayAvg = mean(dayGrades.map((g) => Number(g.total || 0)));
                  return (
                    <Box key={d} sx={{ pl: 1, mb: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtDateDow(d)}</Typography>
                        <Chip size="small" label={`day avg ${dayAvg}`} />
                        <Typography variant="caption" color="text.secondary">{dayGrades.length} evaluator(s)</Typography>
                      </Stack>
                      {dayGrades.map((g) => (
                        <Accordion key={g.uuid} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 0, px: 0.5, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                            <Typography variant="body2" sx={{ flex: 1 }}>{g.evaluatorName || g.evaluatorEmployeeId}</Typography>
                            <Chip size="small" color="success" variant="outlined" label={`total ${g.total}`} sx={{ mr: 1 }} />
                          </AccordionSummary>
                          <AccordionDetails sx={{ px: 1, py: 0.5 }}>
                            <Stack spacing={0.25}>
                              {(g.metrics || []).map((m) => (
                                <Typography key={m.metricId} variant="caption">• {metricName(m.metricId)}: <strong>{m.score}</strong></Typography>
                              ))}
                              {(g.penalties || []).map((pid) => (
                                <Typography key={pid} variant="caption" color="error">− {penaltyName(pid)}</Typography>
                              ))}
                              {g.starPresenter && <Typography variant="caption">★ Star presenter: {g.starPresenter}</Typography>}
                              {g.diction && <Typography variant="caption">Diction: {g.diction}</Typography>}
                              {g.feedback && <Typography variant="caption" color="text.secondary">“{g.feedback}”</Typography>}
                              {!(g.metrics || []).length && !(g.penalties || []).length && !g.feedback && (
                                <Typography variant="caption" color="text.secondary">No detail recorded.</Typography>
                              )}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Box>
                  );
                })}
              </Box>
            );
          })
        )}
      </Box>
    </Drawer>
  );
}

export default function LeaderboardPage() {
  const isMobile = useIsMobile();
  const can = useCan();
  const canDrill = can('assembly.manage') && !isMobile; // breakup: God/Admin, desktop only
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(lastOfMonth());
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [drillHouse, setDrillHouse] = useState(null);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true); setError('');
    try { setBoard(await assemblyService.getLeaderboard(from, to)); }
    catch (err) { setError(err.response?.data?.error?.description || 'Failed to load leaderboard'); }
    finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const standings = board?.standings || [];
  const chartData = standings.filter((s) => s.houseId).map((s) => ({ name: s.houseName || 'House', average: s.average }));

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>House-of-the-Month Leaderboard</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} /></Grid>
            <Grid item xs={6} sm={3}><TextField fullWidth size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} /></Grid>
            <Grid item xs={12} sm={6}><Button variant="outlined" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button></Grid>
          </Grid>
        </CardContent>
      </Card>

      {board?.houseOfTheMonth && (
        <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <TrophyIcon sx={{ fontSize: 48 }} />
              <Box>
                <Typography variant="overline">House of the Month</Typography>
                <Typography variant="h4">{board.houseOfTheMonth.houseName || 'House'}</Typography>
                <Typography variant="body2">Average score {board.houseOfTheMonth.average}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Bar chart — desktop only, keeps the PWA lean. */}
      {!isMobile && chartData.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>House averages</Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#1976d2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Standings</Typography>

          {/* Mobile: compact list (no wide table). Desktop: table (+ rationale for God/Admin). */}
          {isMobile ? (
            <Stack divider={<Divider flexItem />}>
              {standings.map((s, i) => (
                <Stack key={s.houseId || 'none'} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
                  <Typography sx={{ width: 24, fontWeight: 700, color: 'text.secondary' }}>{s.houseId ? i + 1 : '—'}</Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.houseName || 'No house'}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.weekCount} week(s)</Typography>
                  </Box>
                  <Chip size="small" color={i === 0 && s.houseId ? 'primary' : 'default'} label={s.average} />
                </Stack>
              ))}
              {standings.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>No graded assemblies in this range.</Typography>}
            </Stack>
          ) : (
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>#</TableCell><TableCell>House</TableCell><TableCell align="center">Weeks</TableCell><TableCell align="center">Average</TableCell>
                {canDrill && <TableCell align="right" />}
              </TableRow></TableHead>
              <TableBody>
                {standings.map((s, i) => (
                  <TableRow key={s.houseId || 'none'}>
                    <TableCell>{s.houseId ? i + 1 : '—'}</TableCell>
                    <TableCell>{s.houseName || <em style={{ color: '#999' }}>No house</em>}</TableCell>
                    <TableCell align="center">{s.weekCount}</TableCell>
                    <TableCell align="center"><Chip size="small" color={i === 0 && s.houseId ? 'primary' : 'default'} label={s.average} /></TableCell>
                    {canDrill && (
                      <TableCell align="right">
                        {s.houseId && s.weeks?.length ? (
                          <Button size="small" startIcon={<RationaleIcon />} onClick={() => setDrillHouse(s)}>View rationale</Button>
                        ) : null}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {standings.length === 0 && <TableRow><TableCell colSpan={canDrill ? 5 : 4}><Typography variant="body2" color="text.secondary">No graded assemblies in this range.</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          )}

          {standings.some((s) => s.weeks?.length) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">
                Week-by-week averages feed each house's overall score.{canDrill ? ' Tap “View rationale” to see the day-by-day, evaluator-by-evaluator breakup.' : ''}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {canDrill && <RationaleDrawer house={drillHouse} onClose={() => setDrillHouse(null)} />}
    </Box>
  );
}
