import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  Gavel as GavelIcon,
  Send as SendIcon,
  UploadFile as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Receipt as ReceiptIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { fineService } from '../../../services/fineService';
import { useAuth } from '../../../context/AuthContext';
import EmployeeSearchDialog from '../../../components/common/EmployeeSearchDialog';

const CATEGORY_LABELS = {
  library: 'Library',
  infrastructure_movable: 'Infrastructure (Movable)',
  infrastructure_immovable: 'Infrastructure (Immovable)',
  library_books: 'Library Books',
  medical: 'Medical',
  labs: 'Labs',
};

const STATUS_COLORS = {
  open: 'error',
  under_review: 'warning',
  decision_made: 'info',
  closed: 'success',
};

const STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under Review',
  decision_made: 'Decision Made',
  closed: 'Closed',
};

const formatCurrency = (amount) => {
  if (amount == null) return '-';
  return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN');
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function FineIncidentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Note state
  const [noteText, setNoteText] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  // Evidence state
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Assign dialog
  const [assignDialog, setAssignDialog] = useState(false);
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Decision dialog
  const [decisionDialog, setDecisionDialog] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ decision: 'collect', decidedFineAmount: '' });
  const [savingDecision, setSavingDecision] = useState(false);

  // Evidence viewer
  const [viewDialog, setViewDialog] = useState({ open: false, loading: false, mimeType: null, data: null, fileName: null });

  // Collection form (inline in right card)
  const [collectionForm, setCollectionForm] = useState({
    amountCollected: '',
    collectionDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    notes: '',
  });
  const [collectingFine, setCollectingFine] = useState(false);

  useEffect(() => {
    loadIncident();
  }, [id]);

  const loadIncident = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fineService.getIncidentById(id);
      setIncident(data);
      if (data.decidedFineAmount != null) {
        const remaining = data.decidedFineAmount - (data.totalCollected || 0);
        setCollectionForm((prev) => ({
          ...prev,
          amountCollected: String(Math.max(0, remaining)),
        }));
      }
    } catch {
      setError('Failed to load incident');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNote = async () => {
    if (!noteText.trim()) return;
    setSendingNote(true);
    try {
      await fineService.addNote(id, {
        noteText: noteText.trim(),
        ...(user?.id ? { authorId: user.id, authorType: user.type || 'employee' } : {}),
      });
      setNoteText('');
      loadIncident();
    } catch {
      setError('Failed to send note');
    } finally {
      setSendingNote(false);
    }
  };

  const handleEvidenceFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingEvidence(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        await fineService.uploadEvidence(id, {
          fileName: file.name,
          mimeType: file.type,
          base64Data,
        });
        loadIncident();
        setUploadingEvidence(false);
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setUploadingEvidence(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Failed to upload evidence');
      setUploadingEvidence(false);
    }
  };

  const handleDownloadEvidence = async (evidenceId, fileName) => {
    try {
      const file = await fineService.getEvidence(id, evidenceId);
      const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'evidence';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download evidence');
    }
  };

  const handleViewEvidence = async (evidenceId, fileName) => {
    setViewDialog({ open: true, loading: true, mimeType: null, data: null, fileName });
    try {
      const file = await fineService.getEvidence(id, evidenceId);
      setViewDialog({ open: true, loading: false, mimeType: file.mimeType, data: file.data, fileName });
    } catch {
      setViewDialog({ open: false, loading: false, mimeType: null, data: null, fileName: null });
      setError('Failed to load evidence for viewing');
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    try {
      await fineService.deleteEvidence(id, evidenceId);
      loadIncident();
    } catch {
      setError('Failed to delete evidence');
    }
  };

  const handleAssigneeSelect = (employee) => {
    setSelectedAssignee(employee);
    setEmployeeSearchOpen(false);
  };

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    setAssigning(true);
    try {
      await fineService.updateIncident(id, { assignedToId: selectedAssignee.uuid });
      setAssignDialog(false);
      setSelectedAssignee(null);
      loadIncident();
    } catch {
      setError('Failed to assign incident');
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveDecision = async () => {
    setSavingDecision(true);
    try {
      const payload = { decision: decisionForm.decision };
      if (decisionForm.decision === 'collect' && decisionForm.decidedFineAmount) {
        payload.decidedFineAmount = parseFloat(decisionForm.decidedFineAmount);
      }
      await fineService.updateIncident(id, payload);
      setDecisionDialog(false);
      loadIncident();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to save decision');
    } finally {
      setSavingDecision(false);
    }
  };

  const handleCollectFine = async () => {
    setCollectingFine(true);
    try {
      await fineService.collectFine(id, {
        amountCollected: parseFloat(collectionForm.amountCollected),
        collectionDate: collectionForm.collectionDate,
        paymentMethod: collectionForm.paymentMethod,
        notes: collectionForm.notes || undefined,
      });
      loadIncident();
    } catch (err) {
      setError(err.response?.data?.error?.description || 'Failed to collect fine');
    } finally {
      setCollectingFine(false);
    }
  };

  const handlePrintReceipt = () => {
    const collections = incident.collections || [];
    if (collections.length === 0) return;
    // Print summary using most recent collection's receipt number
    const col = collections[collections.length - 1];
    const totalAmt = incident.totalCollected || col.amountCollected;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Fine Receipt — ${col.receiptNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; max-width: 480px; margin: 0 auto; color: #222; }
    h2 { text-align: center; margin-bottom: 4px; }
    .sub { text-align: center; color: #666; font-size: 13px; margin-bottom: 24px; }
    .receipt-no { text-align: center; font-size: 18px; font-weight: bold; border: 2px solid #222;
      padding: 8px 16px; display: inline-block; margin: 0 auto 24px; }
    .center { text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    td { padding: 6px 4px; font-size: 14px; }
    td:first-child { color: #555; width: 45%; }
    td:last-child { font-weight: 500; }
    .total td { border-top: 2px solid #222; font-weight: bold; font-size: 15px; padding-top: 10px; }
    .footer { margin-top: 32px; text-align: center; font-size: 12px; color: #888; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h2>Fine Collection Receipt</h2>
  <p class="sub">ItsMySkool Admin Portal</p>
  <div class="center"><span class="receipt-no">${col.receiptNumber}</span></div>
  <table>
    <tr><td>Incident Date</td><td>${formatDate(incident.incidentDate)}</td></tr>
    <tr><td>Category</td><td>${CATEGORY_LABELS[incident.category] || incident.category}</td></tr>
    <tr><td>Person</td><td>${incident.personName || '—'}</td></tr>
    <tr><td>Description</td><td>${incident.description || '—'}</td></tr>
    <tr><td>Collection Date</td><td>${formatDate(col.collectionDate)}</td></tr>
    <tr><td>Payment Method</td><td>${(col.paymentMethod || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td></tr>
    ${col.notes ? `<tr><td>Notes</td><td>${col.notes}</td></tr>` : ''}
    <tr class="total"><td>Total Collected</td><td>${formatCurrency(totalAmt)}</td></tr>
  </table>
  <div class="footer">Printed on ${new Date().toLocaleDateString('en-IN')}</div>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!incident) {
    return (
      <Alert severity="error">Incident not found.</Alert>
    );
  }

  const { status, decision } = incident;
  const totalCollected = incident.totalCollected || 0;
  const remainingBalance = (incident.decidedFineAmount || 0) - totalCollected;
  const canAssign = status === 'open' || status === 'under_review';
  const canDecide = (status === 'open' || status === 'under_review') && !decision;
  const canCollect = status === 'decision_made' && decision === 'collect' && remainingBalance > 0;
  const isWaived = decision === 'waive';
  const isClosed = status === 'closed';
  const hasCollections = (incident.collections || []).length > 0;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* ── Left column ── */}
        <Box sx={{ flex: 2, minWidth: 0 }}>
          {/* Incident Info Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h5">Incident Details</Typography>
                {!isClosed && (
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    variant="outlined"
                    onClick={() => navigate(`/fine/incidents/${id}/edit`)}
                  >
                    Edit
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Date</Typography>
                  <Typography>{formatDate(incident.incidentDate)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Category</Typography>
                  <Box>
                    <Chip
                      label={CATEGORY_LABELS[incident.category] || incident.category}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Person</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography>{incident.personName || '—'}</Typography>
                    {incident.personType && (
                      <Chip
                        label={incident.personType}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Suggested Fine</Typography>
                  <Typography>{formatCurrency(incident.suggestedFineAmount)}</Typography>
                </Box>
              </Box>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {incident.description}
              </Typography>
            </CardContent>
          </Card>

          {/* Action Bar */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            {canAssign && (
              <Button
                variant="outlined"
                startIcon={<PersonAddIcon />}
                onClick={() => { setAssignDialog(true); setSelectedAssignee(null); }}
              >
                {incident.assignedToId ? 'Reassign' : 'Assign'}
              </Button>
            )}
            {canDecide && (
              <Button
                variant="outlined"
                startIcon={<GavelIcon />}
                onClick={() => {
                  setDecisionForm({ decision: 'collect', decidedFineAmount: String(incident.suggestedFineAmount || '') });
                  setDecisionDialog(true);
                }}
              >
                Record Decision
              </Button>
            )}
          </Box>

          {/* Conversation Thread */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Conversation
              </Typography>
              <Box
                sx={{
                  maxHeight: 420,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  mb: 2,
                  pr: 1,
                }}
              >
                {(incident.notes || []).length === 0 && (
                  <Typography variant="body2" sx={{ color: '#8f9bb3', textAlign: 'center', py: 2 }}>
                    No notes yet
                  </Typography>
                )}
                {(incident.notes || []).map((note) => {
                  if (note.noteType === 'system') {
                    return (
                      <Box key={note.uuid} sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#8f9bb3', fontStyle: 'italic' }}>
                          {note.noteText} · {formatDateTime(note.createdAt)}
                        </Typography>
                      </Box>
                    );
                  }
                  return (
                    <Box key={note.uuid} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#3366ff', fontSize: 14 }}>
                        {(note.authorName || '?').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.25 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {note.authorName || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#8f9bb3' }}>
                            {formatDateTime(note.createdAt)}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            bgcolor: '#f0f3ff',
                            borderRadius: 2,
                            px: 1.5,
                            py: 1,
                            display: 'inline-block',
                            maxWidth: '100%',
                          }}
                        >
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {note.noteText}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  label="Add a note"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  multiline
                  maxRows={4}
                  size="small"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) handleSendNote();
                  }}
                />
                <IconButton
                  color="primary"
                  onClick={handleSendNote}
                  disabled={sendingNote || !noteText.trim()}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ── Right column ── */}
        <Box sx={{ flex: 1, minWidth: 260 }}>
          {/* Status / Assignment Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Status &amp; Assignment
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Status</Typography>
                  <Box sx={{ mt: 0.25 }}>
                    <Chip
                      label={STATUS_LABELS[status] || status}
                      color={STATUS_COLORS[status] || 'default'}
                      size="small"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Assigned To</Typography>
                  <Typography>{incident.assigneeName || 'Unassigned'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Reported By</Typography>
                  <Typography>{incident.reporterName || '—'}</Typography>
                </Box>
                {decision && (
                  <>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Decision</Typography>
                      <Box sx={{ mt: 0.25 }}>
                        <Chip
                          label={decision === 'collect' ? 'Collect Fine' : 'Waive Fine'}
                          color={decision === 'collect' ? 'primary' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    {incident.decidedFineAmount != null && (
                      <Box>
                        <Typography variant="caption" sx={{ color: '#8f9bb3' }}>Decided Fine</Typography>
                        <Typography sx={{ fontWeight: 600 }}>
                          {formatCurrency(incident.decidedFineAmount)}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Evidence Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Evidence</Typography>
                <Button
                  size="small"
                  startIcon={<UploadIcon />}
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingEvidence}
                >
                  {uploadingEvidence ? 'Uploading...' : 'Upload'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  style={{ display: 'none' }}
                  onChange={handleEvidenceFile}
                />
              </Box>
              {(incident.evidence || []).length === 0 ? (
                <Typography variant="body2" sx={{ color: '#8f9bb3' }}>
                  No evidence uploaded
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(incident.evidence || []).map((ev) => (
                    <Box
                      key={ev.uuid}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        borderRadius: 1,
                        border: '1px solid #e4e9f2',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={ev.fileName}
                      >
                        {ev.fileName}
                      </Typography>
                      <IconButton
                        size="small"
                        title="View"
                        onClick={() => handleViewEvidence(ev.uuid, ev.fileName)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="Download"
                        onClick={() => handleDownloadEvidence(ev.uuid, ev.fileName)}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        title="Delete"
                        onClick={() => handleDeleteEvidence(ev.uuid)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Collection / Receipt Card */}
          {(canCollect || isWaived || isClosed || hasCollections) && (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ReceiptIcon sx={{ color: '#3366ff' }} />
                    <Typography variant="h6">Collection</Typography>
                  </Box>
                  {hasCollections && (
                    <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintReceipt}>
                      Print Receipt
                    </Button>
                  )}
                </Box>

                {isWaived && (
                  <Chip label="Fine Waived" color="default" variant="outlined" />
                )}

                {/* Payment history */}
                {hasCollections && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#8f9bb3' }}>Payment History</Typography>
                    {(incident.collections || []).map((col) => (
                      <Box key={col.uuid} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #f0f0f0' }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{formatCurrency(col.amountCollected)}</Typography>
                          <Typography variant="caption" sx={{ color: '#8f9bb3' }}>
                            {formatDate(col.collectionDate)} · {(col.paymentMethod || 'cash').replace(/_/g, ' ')}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#8f9bb3' }}>{col.receiptNumber}</Typography>
                      </Box>
                    ))}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="body2" fontWeight={600}>Total Collected</Typography>
                      <Typography variant="body2" fontWeight={600} color="success.main">{formatCurrency(totalCollected)}</Typography>
                    </Box>
                    {incident.decidedFineAmount != null && remainingBalance > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="body2" color="error.main">Remaining Balance</Typography>
                        <Typography variant="body2" color="error.main" fontWeight={600}>{formatCurrency(remainingBalance)}</Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {canCollect && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Amount to Collect (₹)"
                      type="number"
                      value={collectionForm.amountCollected}
                      onChange={(e) =>
                        setCollectionForm((prev) => ({ ...prev, amountCollected: e.target.value }))
                      }
                      size="small"
                      inputProps={{ step: '0.01', min: 0 }}
                    />
                    <TextField
                      fullWidth
                      label="Collection Date"
                      type="date"
                      value={collectionForm.collectionDate}
                      onChange={(e) =>
                        setCollectionForm((prev) => ({ ...prev, collectionDate: e.target.value }))
                      }
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      fullWidth
                      select
                      label="Payment Method"
                      value={collectionForm.paymentMethod}
                      onChange={(e) =>
                        setCollectionForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
                      }
                      size="small"
                    >
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="upi">UPI</MenuItem>
                      <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                    </TextField>
                    <TextField
                      fullWidth
                      label="Notes (optional)"
                      value={collectionForm.notes}
                      onChange={(e) =>
                        setCollectionForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      size="small"
                      multiline
                      rows={2}
                    />
                    <Button
                      variant="contained"
                      onClick={handleCollectFine}
                      disabled={collectingFine || !collectionForm.amountCollected}
                    >
                      {collectingFine ? 'Processing...' : 'Collect Fine'}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Assign Dialog */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {incident.assignedToId ? 'Reassign Incident' : 'Assign Incident'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {selectedAssignee ? (
              <Chip
                label={selectedAssignee.name}
                onDelete={() => setSelectedAssignee(null)}
                color="primary"
                variant="outlined"
              />
            ) : (
              <Typography variant="body2" sx={{ color: '#8f9bb3', mb: 1 }}>
                No assignee selected
              </Typography>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<SearchIcon />}
              onClick={() => setEmployeeSearchOpen(true)}
              sx={{ mt: 1 }}
            >
              Search Employee
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssign}
            disabled={!selectedAssignee || assigning}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decision Dialog */}
      <Dialog open={decisionDialog} onClose={() => setDecisionDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Decision</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              select
              label="Decision"
              value={decisionForm.decision}
              onChange={(e) =>
                setDecisionForm((prev) => ({ ...prev, decision: e.target.value }))
              }
            >
              <MenuItem value="collect">Collect Fine</MenuItem>
              <MenuItem value="waive">Waive Fine</MenuItem>
            </TextField>
            {decisionForm.decision === 'collect' && (
              <TextField
                fullWidth
                label="Decided Fine Amount (₹)"
                type="number"
                value={decisionForm.decidedFineAmount}
                onChange={(e) =>
                  setDecisionForm((prev) => ({ ...prev, decidedFineAmount: e.target.value }))
                }
                inputProps={{ step: '0.01', min: 0 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecisionDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveDecision}
            disabled={savingDecision}
          >
            {savingDecision ? 'Saving...' : 'Save Decision'}
          </Button>
        </DialogActions>
      </Dialog>

      <EmployeeSearchDialog
        open={employeeSearchOpen}
        onClose={() => setEmployeeSearchOpen(false)}
        onSelect={handleAssigneeSelect}
      />

      {/* Evidence Viewer Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog(p => ({ ...p, open: false }))} maxWidth="md" fullWidth>
        <DialogTitle>{viewDialog.fileName || 'Evidence'}</DialogTitle>
        <DialogContent sx={{ p: 2, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {viewDialog.loading ? (
            <CircularProgress />
          ) : viewDialog.mimeType?.startsWith('image/') ? (
            <img src={`data:${viewDialog.mimeType};base64,${viewDialog.data}`} alt={viewDialog.fileName} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
          ) : viewDialog.mimeType === 'application/pdf' ? (
            <iframe src={`data:application/pdf;base64,${viewDialog.data}`} width="100%" height="560px" title={viewDialog.fileName} style={{ border: 'none' }} />
          ) : (
            <Typography color="text.secondary">Preview not supported — please download this file.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(p => ({ ...p, open: false }))}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
