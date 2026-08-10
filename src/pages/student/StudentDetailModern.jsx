import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Grid, Avatar, Chip, Button, Typography, Divider, IconButton,
  Table, TableBody, TableCell, TableHead, TableRow, Stack, Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon, Delete as DeleteIcon, PhotoCamera as PhotoIcon, Add as AddIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import StudentAttendancePanel from './StudentAttendancePanel';
import StudentTimetableToday from './StudentTimetableToday';
import StudentFeesPanel from './StudentFeesPanel';
import { attendanceService } from '../../services/attendanceService';
import { feesService } from '../../services/feesService';
import { academicCalendarService } from '../../services/academicCalendarService';
import { maskContact } from '../../utils/mask';
import { fmtDate } from '../../utils/date';

const TC_STATUS_COLOR = { applied: 'warning', issued: 'success', cancelled: 'default' };
const inr = (n) => `₹${Math.round(Number(n || 0)).toLocaleString('en-IN')}`;

function prettyPref(pref) {
  if (!pref) return 'Auto (default)';
  const [recipient, channel] = String(pref).split(':');
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const ch = channel === 'sms' ? 'SMS' : channel === 'whatsapp' ? 'WhatsApp' : cap(channel);
  return `${cap(recipient)} first${ch ? ` (${ch})` : ''}`;
}

// A labelled fact row inside a details card.
function Info({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, py: 0.5, borderBottom: '1px dashed', borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{value || '—'}</Typography>
    </Box>
  );
}

function SectionCard({ title, action, children, sx }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', ...sx }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary' }}>{title}</Typography>
          {action}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value, color = 'text.primary', sub, accent }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderLeft: 4, borderColor: accent || 'divider' }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography sx={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>{value}</Typography>
        {sub && <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.25 }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

// Error boundary: if anything in the modern view throws, fall back to classic.
export class ModernErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { if (this.props.onError) this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function StudentDetailModern({ ctx }) {
  const {
    student, tcs = [], can, canManage, canViewContacts, canTransferView, canTransferManage,
    photoUrl, guardianPhotos = {}, openLightbox, pickGuardianPhoto, fileRef, handlePhotoPick,
    setGuardianDialog, setAddressDialog, setSiblingSearch, setDelGuardian, setDelAddress, setDelSibling, setTcDialog,
    codeLabel, navigate, id,
  } = ctx;

  const [attn, setAttn] = useState(null); // { percent, present, absent }
  const [fees, setFees] = useState(null); // { dueNow, paid, outstanding, monthEndLabel }
  const canFees = can && can('fee.view');

  // Light reads for the KPI tiles only (child panels are untouched).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cur = await academicCalendarService.getCurrentAcademicYear();
        const ayId = cur?.uuid;
        const data = await attendanceService.getStudentAttendance(student.uuid, ayId ? { academicYearId: ayId } : {});
        const days = data?.days || [];
        const t = { present: 0, absent: 0, late: 0 };
        for (const d of days) if (t[d.status] !== undefined) t[d.status]++;
        const working = t.present + t.absent + t.late;
        const percent = working > 0 ? Math.round(((t.present + t.late) / working) * 100) : null;
        if (alive) setAttn({ percent, present: t.present, absent: t.absent });
        if (canFees) {
          const s = await feesService.getStudentSummary(student.uuid, ayId).catch(() => null);
          if (alive && s) setFees(s);
        }
      } catch { /* KPIs are best-effort; tiles show — */ }
    })();
    return () => { alive = false; };
  }, [student.uuid, canFees]);

  const guardians = student.guardians || [];
  const addresses = student.addresses || [];
  const enrollments = student.enrollments || [];
  const siblings = student.siblings || [];
  const reachable = Boolean(student.studentMobile || student.studentWhatsapp || student.studentEmail
    || guardians.some((g) => g.mobile || g.whatsapp || g.email));
  const attColor = attn?.percent == null ? 'text.primary' : attn.percent >= 85 ? 'success.main' : attn.percent >= 70 ? 'warning.main' : 'error.main';

  return (
    <Box>
      {/* HERO */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Tooltip title={photoUrl ? 'View photo' : ''}>
              <Avatar src={photoUrl} onClick={() => photoUrl && openLightbox(photoUrl, student.name)}
                sx={{ width: 92, height: 92, fontSize: 34, borderRadius: 3, cursor: photoUrl ? 'pointer' : 'default' }}>
                {student.name?.[0]}
              </Avatar>
            </Tooltip>
            {canManage && (
              <>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={handlePhotoPick} />
                <Button size="small" startIcon={<PhotoIcon />} sx={{ mt: 0.5, fontSize: 11 }} onClick={() => fileRef.current?.click()}>
                  {photoUrl ? 'Change' : 'Add'}
                </Button>
              </>
            )}
          </Box>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{student.name}</Typography>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
              <Chip size="small" color="primary" label={`Class ${student.currentClassName || '—'}`} />
              {student.currentStreamCode && <Chip size="small" variant="outlined" label={student.currentStreamName || student.currentStreamCode} />}
              {student.currentRollNumber != null && <Chip size="small" variant="outlined" label={`Roll ${student.currentRollNumber}`} />}
              {student.houseName && <Chip size="small" variant="outlined" label={student.houseName} />}
              <Chip size="small" color={student.status === 'active' ? 'success' : 'default'} label={student.status} />
              <Chip size="small" color={reachable ? 'success' : 'warning'} variant="outlined" label={reachable ? 'Reachable' : 'No contact'} />
            </Stack>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: '4px 20px', mt: 1.25 }}>
              <Typography variant="body2" color="text.secondary">Admission <b style={{ color: 'inherit' }}>{student.admissionNumber || '—'}</b></Typography>
              <Typography variant="body2" color="text.secondary">DOB <b>{student.dob ? fmtDate(student.dob) : '—'}</b></Typography>
              {student.classTeacher?.name && <Typography variant="body2" color="text.secondary">Class teacher <b>{student.classTeacher.name}</b></Typography>}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* KPI TILES */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid item xs={6} md={3}><Kpi label="Attendance · term" value={attn?.percent == null ? '—' : `${attn.percent}%`} color={attColor} accent={attn?.percent == null ? undefined : (attn.percent >= 85 ? 'success.main' : attn.percent >= 70 ? 'warning.main' : 'error.main')} sub={attn ? `${attn.present} present · ${attn.absent} absent` : ' '} /></Grid>
        {canFees ? (
          <>
            <Grid item xs={6} md={3}><Kpi label="Dues now" value={inr(fees?.dueNow)} color="error.main" accent="error.main" sub={fees?.monthEndLabel || ' '} /></Grid>
            <Grid item xs={6} md={3}><Kpi label="Paid this year" value={inr(fees?.paid)} accent="success.main" sub={fees ? `of ${inr((fees.paid || 0) + (fees.outstanding || 0))} full year` : ' '} /></Grid>
          </>
        ) : (
          <Grid item xs={6} md={3}><Kpi label="Present days" value={attn ? attn.present : '—'} accent="success.main" sub="this term" /></Grid>
        )}
        <Grid item xs={6} md={3}><Kpi label="Family" value={siblings.length} accent="primary.main" sub={siblings.length === 1 ? 'sibling in school' : 'siblings in school'} /></Grid>
      </Grid>

      {/* DETAILS — width-filling card grid (no gutter) */}
      <Grid container spacing={2} sx={{ mt: 0 }}>
        <Grid item xs={12} sm={6} md={4}>
          <SectionCard title="Class & placement">
            <Info label="Class" value={student.currentClassName} />
            {student.currentStreamCode && <Info label="Stream" value={student.currentStreamName || student.currentStreamCode} />}
            <Info label="Roll #" value={student.currentRollNumber} />
            <Info label="House" value={student.houseName} />
            {student.classTeacher && <>
              <Info label="Class teacher" value={student.classTeacher.name} />
              <Info label="Teacher mobile" value={maskContact(student.classTeacher.mobile, 'phone', canViewContacts)} />
              <Info label="Subject" value={student.classTeacher.subjects} />
            </>}
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <SectionCard title="Contact & preference" action={canManage && <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={() => navigate(`/students/${id}/edit`)}>Edit</Button>}>
            <Info label="Student mobile" value={maskContact(student.studentMobile, 'phone', canViewContacts)} />
            <Info label="Student email" value={student.studentEmail} />
            <Info label="WhatsApp" value={maskContact(student.studentWhatsapp, 'phone', canViewContacts)} />
            <Info label="Comm. preference" value={prettyPref(student.communicationPreference)} />
            <Info label="Aadhaar" value={maskContact(student.aadhaarNumber, 'aadhaar', canViewContacts)} />
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <SectionCard title="Personal">
            <Info label="Gender" value={student.gender} />
            <Info label="Date of birth" value={student.dob ? fmtDate(student.dob) : null} />
            <Info label="Category" value={codeLabel('category', student.categoryCode)} />
            <Info label="Blood group" value={codeLabel('blood_group', student.bloodGroupCode)} />
            <Info label="Nationality" value={codeLabel('nationality', student.nationalityCode)} />
            <Info label="Mother tongue" value={codeLabel('mother_tongue', student.motherTongueCode)} />
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <SectionCard title="Admission">
            <Info label="Admission #" value={student.admissionNumber} />
            <Info label="Admission date" value={student.admissionDate ? fmtDate(student.admissionDate) : null} />
            <Info label="Previous school" value={student.previousSchool} />
            <Info label="Family #" value={student.familyUniqueNumber} />
            {student.status === 'inactive' && <>
              <Info label="Withdrawn" value={student.withdrawalDate ? fmtDate(student.withdrawalDate) : null} />
              <Info label="Remarks" value={student.withdrawalRemarks} />
            </>}
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <SectionCard title="Guardians" action={canManage && <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setGuardianDialog({ open: true, initial: null })}>Add</Button>}>
            {guardians.length === 0 ? <Typography variant="body2" color="text.secondary">No guardians added.</Typography> : (
              <Stack divider={<Divider flexItem />} spacing={1}>
                {guardians.map((g) => (
                  <Box key={g.uuid} sx={{ display: 'flex', gap: 1.25 }}>
                    <Avatar src={guardianPhotos[g.uuid]} onClick={guardianPhotos[g.uuid] ? () => openLightbox(guardianPhotos[g.uuid], g.name || g.relation) : (canManage ? () => pickGuardianPhoto(g.uuid) : undefined)}
                      sx={{ width: 40, height: 40, cursor: guardianPhotos[g.uuid] || canManage ? 'pointer' : 'default' }}>
                      {g.name?.[0] || g.relation?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '.04em', color: 'text.secondary', fontWeight: 700 }}>
                        {g.relation}{g.relationship && (g.relation === 'guardian' || g.relation === 'other') ? ` · ${codeLabel('relationship', g.relationship)}` : ''}
                        {g.isPrimaryContact && <Tooltip title="Primary contact"><StarIcon color="warning" sx={{ fontSize: 13, ml: 0.5, verticalAlign: 'middle' }} /></Tooltip>}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{g.name || '—'}</Typography>
                      {(g.occupation || g.organisation) && <Typography variant="caption" color="text.secondary" display="block">{[g.occupation, g.organisation].filter(Boolean).join(' · ')}</Typography>}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {[g.mobile && maskContact(g.mobile, 'phone', canViewContacts), g.whatsapp && maskContact(g.whatsapp, 'phone', canViewContacts), g.email && maskContact(g.email, 'email', canViewContacts)].filter(Boolean).join(' · ') || '—'}
                      </Typography>
                    </Box>
                    {canManage && (
                      <Box sx={{ flex: 'none' }}>
                        <IconButton size="small" onClick={() => setGuardianDialog({ open: true, initial: g })}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDelGuardian({ open: true, item: g })}><DeleteIcon fontSize="small" /></IconButton>
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <SectionCard title="Address" action={canManage && <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setAddressDialog({ open: true, initial: null })}>Add</Button>}>
            {addresses.length === 0 ? <Typography variant="body2" color="text.secondary">No addresses added.</Typography> : (
              <Stack divider={<Divider flexItem />} spacing={1}>
                {addresses.map((a) => (
                  <Box key={a.uuid}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {a.isPermanent && <Chip size="small" label="Permanent" color="primary" variant="outlined" />}
                        {a.isCommunication && <Chip size="small" label="Communication" color="success" variant="outlined" />}
                      </Stack>
                      {canManage && (
                        <Box sx={{ flex: 'none' }}>
                          <IconButton size="small" onClick={() => setAddressDialog({ open: true, initial: a })}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => setDelAddress({ open: true, item: a })}><DeleteIcon fontSize="small" /></IconButton>
                        </Box>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{a.line || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[codeLabel('locality', a.localityCode), codeLabel('city', a.cityCode), codeLabel('state', a.stateCode), a.pincode].filter(Boolean).join(', ') || '—'}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <SectionCard title="Siblings" action={canManage && <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setSiblingSearch(true)}>Link</Button>}>
            {siblings.length === 0 ? <Typography variant="body2" color="text.secondary">No siblings linked.</Typography> : (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {siblings.map((sib) => (
                  <Chip key={sib.uuid} variant="outlined"
                    label={`${sib.name || '—'}${sib.className ? ` · ${sib.className}` : ''}`}
                    onClick={() => navigate(`/students/${sib.siblingStudentId}`)}
                    onDelete={canManage ? () => setDelSibling({ open: true, item: sib }) : undefined} />
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} sm={6} md={8}>
          <SectionCard title="Enrollment history">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Academic Year</TableCell><TableCell>Class</TableCell><TableCell>Roll #</TableCell><TableCell>Joined</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {enrollments.length === 0 ? <TableRow><TableCell colSpan={4}>No enrollment records.</TableCell></TableRow> : enrollments.map((e) => {
                  const isGap = e.kind === 'gap'; const isHist = e.kind === 'historical';
                  return (
                    <TableRow key={e.uuid} sx={isGap ? { '& td': { color: 'text.disabled', fontStyle: 'italic' } } : undefined}>
                      <TableCell>{e.academicYearName || '—'}</TableCell>
                      <TableCell>{isGap ? <Chip size="small" label="Gap year" color="warning" variant="outlined" /> : <>{e.className || '—'}{e.streamCode ? ` · ${e.streamName || e.streamCode}` : ''}{isHist && <Chip size="small" label="prev. adm" variant="outlined" sx={{ ml: 1 }} />}</>}</TableCell>
                      <TableCell>{isGap ? '—' : (e.rollNumber ?? '—')}</TableCell>
                      <TableCell>{isGap ? '—' : (e.joinDate ? fmtDate(e.joinDate) : '—')}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </SectionCard>
        </Grid>
      </Grid>

      {/* FULL-WIDTH PANELS — attendance calendar kept exactly as-is */}
      <Box sx={{ mt: 2 }}><StudentAttendancePanel studentId={student.uuid} /></Box>
      <Box sx={{ mt: 2 }}><StudentTimetableToday classId={student.currentEffectiveClassId || student.currentClassId} /></Box>
      {canFees && <Box sx={{ mt: 2 }}><StudentFeesPanel studentId={student.uuid} student={student} /></Box>}

      {canTransferView && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Transfer Certificate</Typography>
              {canTransferManage && <Button size="small" startIcon={<AddIcon />} onClick={() => setTcDialog({ open: true, initial: null })}>Apply</Button>}
            </Box>
            {tcs.length === 0 ? <Typography variant="body2" color="text.secondary">No transfer certificate records.</Typography> : (
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>Status</TableCell><TableCell>SRN</TableCell><TableCell>Applied</TableCell><TableCell>Issued</TableCell><TableCell>Attendance/Working</TableCell>{canTransferManage && <TableCell align="right">Action</TableCell>}
                </TableRow></TableHead>
                <TableBody>
                  {tcs.map((tc) => (
                    <TableRow key={tc.uuid}>
                      <TableCell><Chip size="small" label={tc.status} color={TC_STATUS_COLOR[tc.status] || 'default'} /></TableCell>
                      <TableCell>{tc.srnNumber || '—'}</TableCell>
                      <TableCell>{tc.applicationDate ? fmtDate(tc.applicationDate) : '—'}</TableCell>
                      <TableCell>{tc.issueDate ? fmtDate(tc.issueDate) : '—'}</TableCell>
                      <TableCell>{tc.totalAttendanceDays != null || tc.totalWorkingDays != null ? `${tc.totalAttendanceDays ?? '—'} / ${tc.totalWorkingDays ?? '—'}` : '—'}</TableCell>
                      {canTransferManage && <TableCell align="right">{tc.status !== 'issued' && tc.status !== 'cancelled' && <Button size="small" onClick={() => setTcDialog({ open: true, initial: tc })}>Update</Button>}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
