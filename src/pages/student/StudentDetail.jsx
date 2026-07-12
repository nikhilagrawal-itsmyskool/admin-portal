import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Alert,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Tooltip,
  Autocomplete,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoIcon,
  Add as AddIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { studentService } from '../../services/studentService';
import { transferService } from '../../services/transferService';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StudentSearchDialog from '../../components/common/StudentSearchDialog';
import { useCan } from '../../permissions/can';
import { ACTIONS } from '../../permissions/actions';
import { maskContact } from '../../utils/mask';

const RELATIONS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
];

const TC_STATUS_COLOR = { applied: 'warning', issued: 'success', cancelled: 'default' };

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]); // strip data: prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EMPTY_GUARDIAN = {
  relation: 'father', relationship: '', name: '', occupation: '', designation: '',
  organisation: '', education: '', address: '', mobile: '', whatsapp: '', email: '', isPrimaryContact: false,
};

function GuardianDialog({ open, onClose, onSave, initial, lookups }) {
  const [g, setG] = useState(EMPTY_GUARDIAN);
  useEffect(() => {
    if (open) setG(initial ? { ...EMPTY_GUARDIAN, ...initial } : EMPTY_GUARDIAN);
  }, [open, initial]);
  const set = (k) => (e) => setG((p) => ({ ...p, [k]: e.target.value }));
  const relationships = lookups?.relationship || [];
  // "relationship" (specific label) only applies to a generic guardian/other; for
  // father/mother the relation already says it, so the field is hidden & cleared.
  const showRelationship = g.relation === 'guardian' || g.relation === 'other';
  const onRelationChange = (e) => {
    const relation = e.target.value;
    setG((p) => ({ ...p, relation, relationship: relation === 'guardian' || relation === 'other' ? p.relationship : '' }));
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Guardian' : 'Add Guardian'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select label="Relation" value={g.relation} onChange={onRelationChange} size="small">
              {RELATIONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {showRelationship && (
            <Grid item xs={12} sm={4}>
              <TextField fullWidth select label="Relationship" value={g.relationship || ''} onChange={set('relationship')} size="small" helperText="e.g. Uncle, Sister">
                <MenuItem value="">—</MenuItem>
                {g.relationship && !relationships.some((o) => o.code === g.relationship) && (
                  <MenuItem value={g.relationship}>{g.relationship}</MenuItem>
                )}
                {relationships.map((o) => (
                  <MenuItem key={o.uuid} value={o.code}>{o.label || o.code}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid item xs={12} sm={showRelationship ? 4 : 8}>
            <TextField fullWidth label="Name" value={g.name} onChange={set('name')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Occupation" value={g.occupation} onChange={set('occupation')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Education" value={g.education} onChange={set('education')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Designation" value={g.designation} onChange={set('designation')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Organisation" value={g.organisation} onChange={set('organisation')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Mobile" value={g.mobile} onChange={set('mobile')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="WhatsApp" value={g.whatsapp} onChange={set('whatsapp')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Email" value={g.email} onChange={set('email')} size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Address (overrides household)" value={g.address} onChange={set('address')} size="small" multiline rows={2} helperText="Leave blank to use the student's communication address" />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              label="Primary contact"
              value={g.isPrimaryContact ? 'yes' : 'no'}
              onChange={(e) => setG((p) => ({ ...p, isPrimaryContact: e.target.value === 'yes' }))}
              size="small"
            >
              <MenuItem value="no">No</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(g)} disabled={!g.relation}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const EMPTY_ADDRESS = {
  isPermanent: false, isCommunication: false, line: '', localityCode: '', cityCode: '',
  stateCode: '', countryCode: 'india', pincode: '',
};

function LookupAutocomplete({ label, value, options, onChange }) {
  // freeSolo: pick an existing lookup or type a new value (backend auto-creates city/locality).
  const selected = options.find((o) => o.code === value) || (value ? { code: value, label: value } : null);
  return (
    <Autocomplete
      freeSolo
      options={options}
      value={selected}
      getOptionLabel={(o) => (typeof o === 'string' ? o : o.label || o.code || '')}
      isOptionEqualToValue={(o, v) => o.code === (v?.code ?? v)}
      onChange={(e, v) => onChange(typeof v === 'string' ? v : v?.code || '')}
      onInputChange={(e, v, reason) => { if (reason === 'input') onChange(v); }}
      renderInput={(p) => <TextField {...p} label={label} size="small" />}
    />
  );
}

function AddressDialog({ open, onClose, onSave, initial, lookups, onSuggestPincode }) {
  const [a, setA] = useState(EMPTY_ADDRESS);
  useEffect(() => {
    if (open) setA(initial ? { ...EMPTY_ADDRESS, ...initial } : EMPTY_ADDRESS);
  }, [open, initial]);
  const set = (k) => (e) => setA((p) => ({ ...p, [k]: e.target.value }));
  const setVal = (k) => (v) => setA((p) => ({ ...p, [k]: v }));
  const toggle = (k) => (e) => setA((p) => ({ ...p, [k]: e.target.checked }));

  const handlePincodeBlur = async () => {
    if (!/^\d{6}$/.test(a.pincode || '') || !onSuggestPincode) return;
    const s = await onSuggestPincode(a.pincode);
    if (!s) return;
    setA((p) => ({
      ...p,
      stateCode: p.stateCode || s.stateCode || '',
      cityCode: p.cityCode || s.cityCode || '',
      localityCode: p.localityCode || s.localityCode || '',
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Address' : 'Add Address'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField fullWidth label="Address line" value={a.line} onChange={set('line')} size="small" multiline rows={2} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <LookupAutocomplete label="Locality" value={a.localityCode} options={lookups.locality || []} onChange={setVal('localityCode')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <LookupAutocomplete label="City" value={a.cityCode} options={lookups.city || []} onChange={setVal('cityCode')} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select label="State" value={a.stateCode || ''} onChange={set('stateCode')} size="small">
              <MenuItem value="">—</MenuItem>
              {(lookups.state || []).map((o) => (
                <MenuItem key={o.uuid} value={o.code}>{o.label || o.code}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select label="Country" value={a.countryCode || ''} onChange={set('countryCode')} size="small">
              <MenuItem value="">—</MenuItem>
              {(lookups.country || []).map((o) => (
                <MenuItem key={o.uuid} value={o.code}>{o.label || o.code}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Pincode" value={a.pincode} onChange={set('pincode')} onBlur={handlePincodeBlur} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!a.isPermanent} onChange={toggle('isPermanent')} />} label="Permanent address" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel control={<Checkbox checked={!!a.isCommunication} onChange={toggle('isCommunication')} />} label="Communication address" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(a)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

const EMPTY_TC = {
  applicationDate: '', srnNumber: '', issueDate: '', reasonForLeaving: '',
  totalAttendanceDays: '', totalWorkingDays: '', status: 'applied',
};

function TcDialog({ open, onClose, onSave, initial }) {
  const [t, setT] = useState(EMPTY_TC);
  useEffect(() => {
    if (open) {
      setT(initial ? {
        applicationDate: initial.applicationDate ? String(initial.applicationDate).slice(0, 10) : '',
        srnNumber: initial.srnNumber || '',
        issueDate: initial.issueDate ? String(initial.issueDate).slice(0, 10) : '',
        reasonForLeaving: initial.reasonForLeaving || '',
        totalAttendanceDays: initial.totalAttendanceDays ?? '',
        totalWorkingDays: initial.totalWorkingDays ?? '',
        status: initial.status || 'applied',
      } : EMPTY_TC);
    }
  }, [open, initial]);
  const set = (k) => (e) => setT((p) => ({ ...p, [k]: e.target.value }));
  const issuing = t.status === 'issued';
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Update Transfer Certificate' : 'Apply for Transfer Certificate'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Application date" type="date" value={t.applicationDate} onChange={set('applicationDate')} size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Status" value={t.status} onChange={set('status')} size="small">
              <MenuItem value="applied">Applied</MenuItem>
              <MenuItem value="issued">Issued</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="Reason for leaving" value={t.reasonForLeaving} onChange={set('reasonForLeaving')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="SRN number" value={t.srnNumber} onChange={set('srnNumber')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Date of TC issue" type="date" value={t.issueDate} onChange={set('issueDate')} size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Total attendance days" type="number" value={t.totalAttendanceDays} onChange={set('totalAttendanceDays')} size="small" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Total working days" type="number" value={t.totalWorkingDays} onChange={set('totalWorkingDays')} size="small" />
          </Grid>
          {issuing && (
            <Grid item xs={12}>
              <Alert severity="warning">Issuing a TC withdraws the student (status becomes inactive).</Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave({
          ...t,
          totalAttendanceDays: t.totalAttendanceDays === '' ? undefined : Number(t.totalAttendanceDays),
          totalWorkingDays: t.totalWorkingDays === '' ? undefined : Number(t.totalWorkingDays),
        })}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function StudentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileRef = useRef(null);
  const guardianFileRef = useRef(null);
  const can = useCan();
  const canManage = can(ACTIONS.STUDENT_MANAGE);
  const canViewContacts = can(ACTIONS.STUDENT_VIEW_CONTACTS);
  const canTransferView = can(ACTIONS.TRANSFER_VIEW);
  const canTransferManage = can(ACTIONS.TRANSFER_MANAGE);

  const [student, setStudent] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [guardianPhotos, setGuardianPhotos] = useState({}); // guardianId -> dataUrl
  const [photoTarget, setPhotoTarget] = useState(null); // guardianId being (re)photographed
  const [lookups, setLookups] = useState({}); // { state: [...], city: [...], relationship: [...], ... }
  const [tcs, setTcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [guardianDialog, setGuardianDialog] = useState({ open: false, initial: null });
  const [delGuardian, setDelGuardian] = useState({ open: false, item: null });
  const [addressDialog, setAddressDialog] = useState({ open: false, initial: null });
  const [delAddress, setDelAddress] = useState({ open: false, item: null });
  const [siblingSearch, setSiblingSearch] = useState(false);
  const [delSibling, setDelSibling] = useState({ open: false, item: null });
  const [tcDialog, setTcDialog] = useState({ open: false, initial: null });

  useEffect(() => {
    load();
    loadLookups();
  }, [id]);

  const loadLookups = async () => {
    try {
      const { lookups: rows } = await studentService.getLookups();
      const grouped = {};
      for (const row of rows || []) (grouped[row.lookupType] = grouped[row.lookupType] || []).push(row);
      setLookups(grouped);
    } catch {
      /* dropdowns degrade to raw codes */
    }
  };

  // Resolve a lookup code to its label for display (falls back to the code).
  const codeLabel = (type, code) => {
    if (!code) return null;
    const hit = (lookups[type] || []).find((o) => o.code === code);
    return hit ? hit.label || hit.code : code;
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const s = await studentService.getStudentById(id);
      setStudent(s);
      loadPhoto();
      loadGuardianPhotos(s.guardians || []);
      loadTcs();
    } catch {
      setError('Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  const loadTcs = async () => {
    if (!canTransferView) return; // transfer is admin/god only
    try {
      const { tcs: rows } = await transferService.getTcs(id);
      setTcs(rows || []);
    } catch {
      setTcs([]);
    }
  };

  // ---- Address handlers ----
  const saveAddress = async (a) => {
    try {
      if (a.uuid) await studentService.updateAddress(id, a.uuid, a);
      else await studentService.createAddress(id, a);
      setAddressDialog({ open: false, initial: null });
      load();
    } catch {
      setError('Failed to save address');
    }
  };
  const removeAddress = async () => {
    try {
      await studentService.deleteAddress(id, delAddress.item.uuid);
      setDelAddress({ open: false, item: null });
      load();
    } catch {
      setError('Failed to delete address');
    }
  };

  // ---- Sibling handlers ----
  const addSibling = async (stu) => {
    setSiblingSearch(false);
    if (!stu || stu.uuid === id) return;
    try {
      await studentService.linkSibling(id, stu.uuid);
      load();
    } catch {
      setError('Failed to link sibling');
    }
  };
  const removeSibling = async () => {
    try {
      await studentService.unlinkSibling(id, delSibling.item.siblingStudentId);
      setDelSibling({ open: false, item: null });
      load();
    } catch {
      setError('Failed to unlink sibling');
    }
  };

  // ---- TC handlers ----
  const saveTc = async (t) => {
    try {
      if (t.uuid) await transferService.updateTc(id, t.uuid, t);
      else await transferService.createTc(id, t);
      setTcDialog({ open: false, initial: null });
      load();
    } catch (err) {
      setError(err?.response?.data?.error?.description || 'Failed to save transfer certificate');
    }
  };

  const loadGuardianPhotos = async (guardians) => {
    const entries = await Promise.all(
      guardians
        .filter((g) => g.photoId)
        .map(async (g) => {
          try {
            const p = await studentService.getPhoto('guardian', g.uuid);
            return [g.uuid, `data:${p.mimeType};base64,${p.data}`];
          } catch {
            return [g.uuid, ''];
          }
        })
    );
    setGuardianPhotos(Object.fromEntries(entries));
  };

  const pickGuardianPhoto = (guardianId) => {
    setPhotoTarget(guardianId);
    guardianFileRef.current?.click();
  };

  const handleGuardianPhotoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !photoTarget) return;
    try {
      const base64Data = await fileToBase64(file);
      await studentService.uploadPhoto('guardian', photoTarget, {
        fileName: file.name,
        mimeType: file.type,
        base64Data,
      });
      load();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Photo upload failed (use JPEG/PNG under 2 MB)');
    } finally {
      if (guardianFileRef.current) guardianFileRef.current.value = '';
      setPhotoTarget(null);
    }
  };

  const loadPhoto = async () => {
    try {
      const p = await studentService.getPhoto('student', id);
      setPhotoUrl(`data:${p.mimeType};base64,${p.data}`);
    } catch {
      setPhotoUrl('');
    }
  };

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64Data = await fileToBase64(file);
      await studentService.uploadPhoto('student', id, { fileName: file.name, mimeType: file.type, base64Data });
      loadPhoto();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Photo upload failed (use JPEG/PNG under 2 MB)');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveGuardian = async (g) => {
    try {
      if (g.uuid) {
        await studentService.updateGuardian(id, g.uuid, g);
      } else {
        await studentService.createGuardian(id, g);
      }
      setGuardianDialog({ open: false, initial: null });
      load();
    } catch {
      setError('Failed to save guardian');
    }
  };

  const removeGuardian = async () => {
    try {
      await studentService.deleteGuardian(id, delGuardian.item.uuid);
      setDelGuardian({ open: false, item: null });
      load();
    } catch {
      setError('Failed to delete guardian');
    }
  };

  if (loading) return <Typography>Loading…</Typography>;
  if (!student) return <Alert severity="error">{error || 'Not found'}</Alert>;

  // Reachability: a message can go out if the student has an own contact or any
  // guardian has one. Primary-contact + preference decide *who* (resolution lives
  // in the communication module); here we only warn when nobody is reachable.
  const guardianList = student.guardians || [];
  const anyGuardianContact = guardianList.some((g) => g.mobile || g.whatsapp || g.email);
  const studentHasContact = Boolean(student.studentMobile || student.studentWhatsapp || student.studentEmail);
  const reachable = studentHasContact || anyGuardianContact;
  const hasPrimaryGuardian = guardianList.some((g) => g.isPrimaryContact);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/students')}>
          Back
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {student.name}
        </Typography>
        {canManage && (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/students/${id}/edit`)}>
            Edit
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {!reachable && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No contact on file — add a student mobile/email or a guardian contact so messages can reach this student.
        </Alert>
      )}
      {reachable && !hasPrimaryGuardian && !student.communicationPreference && guardianList.length > 1 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No primary contact or preference set — messages will use the default ladder (first guardian with a contact, then the student). Mark a primary contact or set a preference to be explicit.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Identity card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar src={photoUrl} sx={{ width: 120, height: 120, mx: 'auto', mb: 1, fontSize: 40 }}>
                {student.name?.[0]}
              </Avatar>
              {canManage && (
                <>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={handlePhotoPick} />
                  <Button size="small" startIcon={<PhotoIcon />} onClick={() => fileRef.current?.click()}>
                    {photoUrl ? 'Change photo' : 'Add photo'}
                  </Button>
                </>
              )}
              <Divider sx={{ my: 2 }} />
              <Stack spacing={0.5} sx={{ textAlign: 'left' }}>
                <Fact label="Admission #" value={student.admissionNumber} />
                <Fact label="Class" value={student.currentClassName} />
                <Fact label="Roll #" value={student.currentRollNumber} />
                <Fact label="House" value={student.houseName} />
                <Fact label="Gender" value={student.gender} />
                <Fact label="DOB" value={student.dob ? String(student.dob).slice(0, 10) : null} />
                <Fact label="Category" value={codeLabel('category', student.categoryCode)} />
                <Fact label="Blood group" value={codeLabel('blood_group', student.bloodGroupCode)} />
                <Fact label="Nationality" value={codeLabel('nationality', student.nationalityCode)} />
                <Fact label="Mother tongue" value={codeLabel('mother_tongue', student.motherTongueCode)} />
                <Fact label="Aadhaar" value={maskContact(student.aadhaarNumber, 'aadhaar', canViewContacts)} />
                <Fact label="Student email" value={student.studentEmail} />
                <Fact label="Student mobile" value={maskContact(student.studentMobile, 'phone', canViewContacts)} />
                <Fact label="Student WhatsApp" value={maskContact(student.studentWhatsapp, 'phone', canViewContacts)} />
                <Fact label="Previous school" value={student.previousSchool} />
                <Fact label="Admission date" value={student.admissionDate ? String(student.admissionDate).slice(0, 10) : null} />
                <Fact label="Family #" value={student.familyUniqueNumber} />
                <Fact label="Comm. pref" value={prettyPref(student.communicationPreference)} />
                {student.status === 'inactive' && (
                  <>
                    <Fact label="Withdrawn" value={student.withdrawalDate ? String(student.withdrawalDate).slice(0, 10) : null} />
                    <Fact label="Remarks" value={student.withdrawalRemarks} />
                  </>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={student.status}
                    size="small"
                    color={student.status === 'active' ? 'success' : 'default'}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Guardians + enrollment */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Guardians</Typography>
                {canManage && (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setGuardianDialog({ open: true, initial: null })}>
                    Add
                  </Button>
                )}
              </Box>
              {/* Shared hidden input for guardian photo uploads */}
              <input
                ref={guardianFileRef}
                type="file"
                accept="image/png,image/jpeg"
                hidden
                onChange={handleGuardianPhotoPick}
              />
              {(student.guardians || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No guardians added yet.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {student.guardians.map((g) => (
                    <Grid item xs={12} sm={6} key={g.uuid}>
                      <Card variant="outlined">
                        <CardContent sx={{ pb: '12px !important' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Tooltip title={canManage ? 'Change photo' : ''}>
                                <Avatar
                                  src={guardianPhotos[g.uuid]}
                                  onClick={canManage ? () => pickGuardianPhoto(g.uuid) : undefined}
                                  sx={{ width: 40, height: 40, cursor: canManage ? 'pointer' : 'default' }}
                                >
                                  {g.name?.[0] || g.relation?.[0]?.toUpperCase()}
                                </Avatar>
                              </Tooltip>
                              <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                                {g.relation}
                                {g.relationship && (g.relation === 'guardian' || g.relation === 'other') ? ` · ${codeLabel('relationship', g.relationship)}` : ''}
                                {g.isPrimaryContact && (
                                  <Tooltip title="Primary contact">
                                    <StarIcon fontSize="inherit" color="warning" sx={{ ml: 0.5, verticalAlign: 'middle' }} />
                                  </Tooltip>
                                )}
                              </Typography>
                            </Box>
                            {canManage && (
                              <Box>
                                <IconButton size="small" onClick={() => setGuardianDialog({ open: true, initial: g })}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => setDelGuardian({ open: true, item: g })}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>{g.name || '—'}</Typography>
                          {(g.occupation || g.designation || g.organisation) && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {[g.occupation, [g.designation, g.organisation].filter(Boolean).join(' @ ')].filter(Boolean).join(' · ')}
                            </Typography>
                          )}
                          {g.education && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {g.education}
                            </Typography>
                          )}
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {[
                              g.mobile && maskContact(g.mobile, 'phone', canViewContacts),
                              g.whatsapp && maskContact(g.whatsapp, 'phone', canViewContacts),
                              g.email && maskContact(g.email, 'email', canViewContacts),
                            ]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Enrollment history
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Academic Year</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Roll #</TableCell>
                    <TableCell>Joined</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(student.enrollments || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>No enrollment records.</TableCell>
                    </TableRow>
                  ) : (
                    student.enrollments.map((e) => (
                      <TableRow key={e.uuid}>
                        <TableCell>{e.academicYearName || '—'}</TableCell>
                        <TableCell>{e.className || '—'}</TableCell>
                        <TableCell>{e.rollNumber ?? '—'}</TableCell>
                        <TableCell>{e.joinDate ? String(e.joinDate).slice(0, 10) : '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Addresses</Typography>
                {canManage && (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setAddressDialog({ open: true, initial: null })}>
                    Add
                  </Button>
                )}
              </Box>
              {(student.addresses || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No addresses added yet.</Typography>
              ) : (
                <Grid container spacing={2}>
                  {student.addresses.map((a) => (
                    <Grid item xs={12} sm={6} key={a.uuid}>
                      <Card variant="outlined">
                        <CardContent sx={{ pb: '12px !important' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {a.isPermanent && <Chip size="small" label="Permanent" color="primary" variant="outlined" />}
                              {a.isCommunication && <Chip size="small" label="Communication" color="success" variant="outlined" />}
                            </Box>
                            {canManage && (
                              <Box>
                                <IconButton size="small" onClick={() => setAddressDialog({ open: true, initial: a })}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => setDelAddress({ open: true, item: a })}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>{a.line || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[codeLabel('locality', a.localityCode), codeLabel('city', a.cityCode), codeLabel('state', a.stateCode), a.pincode]
                              .filter(Boolean).join(', ') || '—'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>

          {/* Siblings */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Siblings</Typography>
                {canManage && (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setSiblingSearch(true)}>
                    Link
                  </Button>
                )}
              </Box>
              {(student.siblings || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No siblings linked.</Typography>
              ) : (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {student.siblings.map((sib) => (
                    <Chip
                      key={sib.uuid}
                      label={`${sib.name || '—'}${sib.className ? ` · ${sib.className}` : ''}${sib.admissionNumber ? ` (${sib.admissionNumber})` : ''}`}
                      onClick={() => navigate(`/students/${sib.siblingStudentId}`)}
                      onDelete={canManage ? () => setDelSibling({ open: true, item: sib }) : undefined}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Transfer Certificate (admin/god only) */}
          {canTransferView && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Transfer Certificate</Typography>
                {canTransferManage && (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setTcDialog({ open: true, initial: null })}>
                    Apply
                  </Button>
                )}
              </Box>
              {tcs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No transfer certificate records.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>SRN</TableCell>
                      <TableCell>Applied</TableCell>
                      <TableCell>Issued</TableCell>
                      <TableCell>Attendance/Working</TableCell>
                      {canTransferManage && <TableCell align="right">Action</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tcs.map((tc) => (
                      <TableRow key={tc.uuid}>
                        <TableCell><Chip size="small" label={tc.status} color={TC_STATUS_COLOR[tc.status] || 'default'} /></TableCell>
                        <TableCell>{tc.srnNumber || '—'}</TableCell>
                        <TableCell>{tc.applicationDate ? String(tc.applicationDate).slice(0, 10) : '—'}</TableCell>
                        <TableCell>{tc.issueDate ? String(tc.issueDate).slice(0, 10) : '—'}</TableCell>
                        <TableCell>{tc.totalAttendanceDays != null || tc.totalWorkingDays != null ? `${tc.totalAttendanceDays ?? '—'} / ${tc.totalWorkingDays ?? '—'}` : '—'}</TableCell>
                        {canTransferManage && (
                          <TableCell align="right">
                            {tc.status !== 'issued' && tc.status !== 'cancelled' && (
                              <Button size="small" onClick={() => setTcDialog({ open: true, initial: tc })}>Update</Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          )}

          <Alert severity="info" sx={{ mt: 3 }}>
            360° summary (attendance, conduct, library, dues, health) is coming in a later phase.
          </Alert>
        </Grid>
      </Grid>

      <GuardianDialog
        open={guardianDialog.open}
        initial={guardianDialog.initial}
        lookups={lookups}
        onClose={() => setGuardianDialog({ open: false, initial: null })}
        onSave={saveGuardian}
      />

      <ConfirmDialog
        open={delGuardian.open}
        title="Delete Guardian"
        message="Remove this guardian?"
        onConfirm={removeGuardian}
        onCancel={() => setDelGuardian({ open: false, item: null })}
      />

      <AddressDialog
        open={addressDialog.open}
        initial={addressDialog.initial}
        lookups={lookups}
        onSuggestPincode={async (pincode) => {
          try {
            const { suggestion } = await studentService.suggestPincode(pincode);
            return suggestion;
          } catch {
            return null;
          }
        }}
        onClose={() => setAddressDialog({ open: false, initial: null })}
        onSave={saveAddress}
      />

      <ConfirmDialog
        open={delAddress.open}
        title="Delete Address"
        message="Remove this address?"
        onConfirm={removeAddress}
        onCancel={() => setDelAddress({ open: false, item: null })}
      />

      <StudentSearchDialog
        open={siblingSearch}
        onClose={() => setSiblingSearch(false)}
        onSelect={addSibling}
      />

      <ConfirmDialog
        open={delSibling.open}
        title="Unlink Sibling"
        message="Remove this sibling link?"
        onConfirm={removeSibling}
        onCancel={() => setDelSibling({ open: false, item: null })}
      />

      <TcDialog
        open={tcDialog.open}
        initial={tcDialog.initial}
        onClose={() => setTcDialog({ open: false, initial: null })}
        onSave={saveTc}
      />
    </Box>
  );
}

// Render a compact `recipient:channel` preference token as a readable label.
function prettyPref(pref) {
  if (!pref) return 'Auto (default ladder)';
  const [recipient, channel] = String(pref).split(':');
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const channelLabel = channel === 'sms' ? 'SMS' : channel === 'whatsapp' ? 'WhatsApp' : cap(channel);
  return `${cap(recipient)} first${channelLabel ? ` (${channelLabel})` : ''}`;
}

function Fact({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}
