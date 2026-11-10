import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Inventory2 as SuppliesIcon, EventAvailable as ReturnedIcon } from '@mui/icons-material';
import { suppliesService } from '../../../services/suppliesService';
import { fmtDate } from '../../../utils/date';

const ISSUE_TYPE_LABELS = {
  class_use: 'Class Use',
  department: 'Department',
  individual: 'Individual',
  event: 'Event',
  disposed: 'Disposed',
  transferred: 'Transferred',
};

// A row is "to return" when it can still come back: a returnable issue type that
// hasn't been returned yet. Consumables (department / disposed / transferred) are
// given, not loaned, so they never appear in the outstanding bucket.
const RETURNABLE_TYPES = ['individual', 'class_use', 'event'];
const isOutstanding = (row) => !row.returned && RETURNABLE_TYPES.includes(row.issueType);

function IssueCard({ row }) {
  const outstanding = isOutstanding(row);
  const qty = `${row.quantity}${row.unit ? ` ${row.unit}` : ''}`;
  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
              {row.itemName || 'Item'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {qty} &middot; {fmtDate(row.issueDate)}
            </Typography>
          </Box>
          {row.returned ? (
            <Chip size="small" color="success" icon={<ReturnedIcon />} label="Returned" />
          ) : outstanding ? (
            <Chip size="small" color="warning" label="To return" />
          ) : (
            <Chip size="small" variant="outlined" label="Received" />
          )}
        </Box>

        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
          <Chip size="small" variant="outlined" label={ISSUE_TYPE_LABELS[row.issueType] || row.issueType} />
          {row.purpose && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
              {row.purpose}
            </Typography>
          )}
        </Box>

        {outstanding && row.expectedReturnDate && (
          <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.75 }}>
            Expected back by {fmtDate(row.expectedReturnDate)}
          </Typography>
        )}
        {row.returned && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            Returned {fmtDate(row.returnDate)}
            {row.returnCondition ? ` · ${row.returnCondition}` : ''}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyIssuedSupplies() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await suppliesService.getMyIssues();
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.response?.data?.error?.description || 'Failed to load your issued supplies');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const outstanding = rows.filter(isOutstanding);
  const history = rows.filter((r) => !isOutstanding(r));

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700 }}>
        My Supplies
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Items the store has issued to you, and their return status.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <SuppliesIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">Nothing has been issued to you yet.</Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {outstanding.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="overline" color="warning.main">
                To return ({outstanding.length})
              </Typography>
              {outstanding.map((r) => <IssueCard key={r.uuid} row={r} />)}
            </Box>
          )}
          {history.length > 0 && (
            <Box>
              {outstanding.length > 0 && <Divider sx={{ mb: 2 }} />}
              <Typography variant="overline" color="text.secondary">
                History ({history.length})
              </Typography>
              {history.map((r) => <IssueCard key={r.uuid} row={r} />)}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
