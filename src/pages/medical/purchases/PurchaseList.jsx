import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Alert,
  TextField,
  Autocomplete,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Tooltip,
  CircularProgress,
  LinearProgress,
  FormControlLabel,
  Checkbox,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  RestoreFromTrash as RestoreIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  AttachFile as AttachFileIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { medicalService } from "../../../services/medicalService";
import { useCan } from "../../../permissions/can";
import { ACTIONS } from "../../../permissions/actions";
import ConfirmDialog from "../../../components/common/ConfirmDialog";

const formatDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
};

const formatCurrency = (v) =>
  v != null && v !== "" ? parseFloat(v).toFixed(2) : "—";

function getAcademicYearStart() {
  const today = new Date();
  const year =
    today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return `${year}-04-01`;
}

export default function PurchaseList() {
  const navigate = useNavigate();
  const can = useCan();
  const canEditPurchase = can(ACTIONS.PURCHASE_LOG_EDIT);
  const canRestorePurchase = can(ACTIONS.PURCHASE_LOG_RESTORE);
  const [searchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState(getAcademicYearStart());
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemOptions, setItemOptions] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState({
    open: false,
    item: null,
  });
  const [restoring, setRestoring] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Bill viewer
  const [billDialog, setBillDialog] = useState({
    open: false,
    url: null,
    mimeType: null,
    fileName: null,
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Expandable rows
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [batchItemsCache, setBatchItemsCache] = useState({});
  const [expandLoading, setExpandLoading] = useState(new Set());

  useEffect(() => {
    const sd = getAcademicYearStart();
    const ed = new Date().toISOString().split("T")[0];
    const itemId = searchParams.get("item");
    medicalService
      .getItems()
      .then(setItemOptions)
      .catch(() => {});
    if (itemId) {
      medicalService
        .getItemById(itemId)
        .then((item) => {
          setSelectedItem(item);
          loadBatches({ startDate: sd, endDate: ed, itemId: item.uuid });
        })
        .catch(() => {
          loadBatches({ startDate: sd, endDate: ed });
        });
    } else {
      loadBatches({ startDate: sd, endDate: ed });
    }
  }, []);

  const loadBatches = async ({
    startDate: sd,
    endDate: ed,
    includeDeleted: incDel,
    itemId,
  } = {}) => {
    setLoading(true);
    setError("");
    setExpandedRows(new Set());
    try {
      const params = {};
      if (sd) params.startDate = sd;
      if (ed) params.endDate = ed;
      if (incDel) params.includeDeleted = true;
      if (itemId) params.itemId = itemId;
      const data = await medicalService.getPurchaseBatches(params);
      setBatches(data);
      setPage(0);
    } catch {
      setError("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () =>
    loadBatches({
      startDate,
      endDate,
      includeDeleted,
      itemId: selectedItem?.uuid,
    });

  const handleClear = () => {
    const sd = getAcademicYearStart();
    const ed = new Date().toISOString().split("T")[0];
    setStartDate(sd);
    setEndDate(ed);
    setIncludeDeleted(false);
    setSelectedItem(null);
    loadBatches({ startDate: sd, endDate: ed, includeDeleted: false });
  };

  const toggleExpand = async (uuid) => {
    const next = new Set(expandedRows);
    if (next.has(uuid)) {
      next.delete(uuid);
      setExpandedRows(next);
      return;
    }
    next.add(uuid);
    setExpandedRows(next);
    if (!batchItemsCache[uuid]) {
      setExpandLoading((prev) => new Set(prev).add(uuid));
      try {
        const batch = await medicalService.getPurchaseBatchById(uuid);
        setBatchItemsCache((prev) => ({ ...prev, [uuid]: batch?.items || [] }));
      } catch {
        // silently fail
      } finally {
        setExpandLoading((prev) => {
          const s = new Set(prev);
          s.delete(uuid);
          return s;
        });
      }
    }
  };

  const openBill = async (batchId) => {
    try {
      const file = await medicalService.getBill(batchId);
      const bytes = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      setBillDialog({
        open: true,
        url,
        mimeType: file.mimeType,
        fileName: file.fileName,
      });
    } catch {
      setError("Failed to load bill");
    }
  };

  const closeBill = () => {
    if (billDialog.url) URL.revokeObjectURL(billDialog.url);
    setBillDialog({ open: false, url: null, mimeType: null, fileName: null });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await medicalService.deletePurchaseBatch(deleteDialog.item.uuid);
      setDeleteDialog({ open: false, item: null });
      loadBatches({
        startDate,
        endDate,
        includeDeleted,
        itemId: selectedItem?.uuid,
      });
    } catch {
      setError("Failed to delete purchase batch");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await medicalService.restorePurchaseBatch(restoreDialog.item.uuid);
      setRestoreDialog({ open: false, item: null });
      loadBatches({
        startDate,
        endDate,
        includeDeleted,
        itemId: selectedItem?.uuid,
      });
    } catch {
      setError("Failed to restore purchase batch");
    } finally {
      setRestoring(false);
    }
  };

  const paginatedBatches = batches.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );
  const colSpan = showDetails ? 12 : 9;

  const deletedRowSx = {
    opacity: 0.6,
    backgroundColor: "rgba(244, 67, 54, 0.04)",
    "& td:not(:first-of-type):not(:last-of-type)": {
      textDecoration: "line-through",
    },
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Purchase Log</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/medical/purchases/add")}
        >
          Add Purchase
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pb: "16px !important" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Autocomplete
                options={itemOptions}
                getOptionLabel={(o) => o.name}
                value={selectedItem}
                onChange={(_, val) => setSelectedItem(val)}
                size="small"
                renderInput={(params) => <TextField {...params} label="Item" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeDeleted}
                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                  />
                }
                label="Include deleted"
              />
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                >
                  Clear
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        {loading && <LinearProgress />}
        <Box sx={{ display: "flex", justifyContent: "flex-end", px: 2, pt: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showDetails}
                onChange={(e) => setShowDetails(e.target.checked)}
                size="small"
              />
            }
            label="Show additional details"
            sx={{ "& .MuiFormControlLabel-label": { fontSize: "0.875rem" } }}
          />
        </Box>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{ "& th": { fontWeight: 600, whiteSpace: "nowrap" } }}
              >
                <TableCell sx={{ width: 40 }} />
                <TableCell>Date</TableCell>
                <TableCell>Items</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Cost/Unit</TableCell>
                <TableCell align="right">Total (₹)</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell align="center" sx={{ width: 56 }}>
                  Bills
                </TableCell>
                {showDetails && <TableCell>Invoice No.</TableCell>}
                {showDetails && <TableCell>Batch No.</TableCell>}
                {showDetails && <TableCell>Expiry</TableCell>}
                <TableCell align="center" sx={{ width: 72 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && paginatedBatches.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    No purchases found
                  </TableCell>
                </TableRow>
              )}
              {paginatedBatches.map((row) => {
                const isDeleted = row.status === "deleted";
                const isExpanded = expandedRows.has(row.uuid);
                const isExpandLoading = expandLoading.has(row.uuid);
                const canExpand = (row.itemCount || 0) > 1;

                const expandedItems = batchItemsCache[row.uuid] || [];

                return (
                  <React.Fragment key={row.uuid}>
                    <TableRow
                      sx={isDeleted ? deletedRowSx : undefined}
                      hover={!isDeleted}
                    >
                      <TableCell sx={{ pr: 0 }}>
                        {canExpand && (
                          <Tooltip
                            title={isExpanded ? "Collapse" : "View items"}
                          >
                            <IconButton
                              size="small"
                              onClick={() => toggleExpand(row.uuid)}
                            >
                              {isExpanded ? (
                                <ExpandLessIcon fontSize="small" />
                              ) : (
                                <ExpandMoreIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {formatDate(row.purchaseDate)}
                      </TableCell>
                      <TableCell>
                        {canExpand ? (
                          <Chip
                            label={`${row.itemCount} items`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            onClick={() => toggleExpand(row.uuid)}
                            sx={{ cursor: "pointer" }}
                          />
                        ) : (
                          <Typography variant="body2">
                            {row.itemName || "1 item"}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{row.quantity ?? "—"}</TableCell>
                      <TableCell align="right">
                        {canExpand ? "—" : formatCurrency(row.costPerUnit)}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        {row.totalCost != null
                          ? parseFloat(row.totalCost).toFixed(2)
                          : "—"}
                      </TableCell>
                      <TableCell>{row.supplier || "—"}</TableCell>
                      <TableCell align="center">
                        {row.fileId ? (
                          <Tooltip title="View bill">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openBill(row.uuid)}
                            >
                              <AttachFileIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </TableCell>
                      {showDetails && (
                        <TableCell>{row.invoiceNumber || "—"}</TableCell>
                      )}
                      {showDetails && (
                        <TableCell>{row.batchNo || "—"}</TableCell>
                      )}
                      {showDetails && (
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {formatDate(row.expiryDate)}
                        </TableCell>
                      )}
                      <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                        {!isDeleted && canEditPurchase && (
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() =>
                                navigate(
                                  `/medical/purchases/bulk/${row.uuid}/edit`,
                                )
                              }
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!isDeleted && (
                          <Tooltip title="Delete batch">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                setDeleteDialog({ open: true, item: row })
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {isDeleted && canRestorePurchase && (
                          <Tooltip title="Restore deletion">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() =>
                                setRestoreDialog({ open: true, item: row })
                              }
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>

                    {canExpand &&
                      isExpanded &&
                      (isExpandLoading ? (
                        <TableRow key={row.uuid + "_loading"}>
                          <TableCell colSpan={colSpan} sx={{ py: 1 }}>
                            <Box
                              sx={{ display: "flex", justifyContent: "center" }}
                            >
                              <CircularProgress size={20} />
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        expandedItems.map((item) => (
                          <TableRow
                            key={item.uuid}
                            sx={{
                              backgroundColor: "rgba(0,0,0,0.02)",
                              "& td": { borderBottom: "1px solid #f0f0f0" },
                              ...(isDeleted && {
                                opacity: 0.6,
                                "& td:not(:first-of-type):not(:last-of-type)": {
                                  textDecoration: "line-through",
                                },
                              }),
                            }}
                          >
                            <TableCell />
                            <TableCell />
                            <TableCell sx={{ pl: 3 }}>
                              <Typography
                                variant="body2"
                                sx={{ color: "text.secondary" }}
                              >
                                {item.itemName || item.itemId}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.costPerUnit)}
                            </TableCell>
                            <TableCell align="right">
                              {item.costPerUnit
                                ? (
                                    item.quantity * parseFloat(item.costPerUnit)
                                  ).toFixed(2)
                                : "—"}
                            </TableCell>
                            <TableCell>{row.supplier || "—"}</TableCell>
                            <TableCell />
                            {showDetails && (
                              <TableCell>{row.invoiceNumber || "—"}</TableCell>
                            )}
                            {showDetails && (
                              <TableCell>{item.batchNo || "—"}</TableCell>
                            )}
                            {showDetails && (
                              <TableCell sx={{ whiteSpace: "nowrap" }}>
                                {formatDate(item.expiryDate)}
                              </TableCell>
                            )}
                            <TableCell />
                          </TableRow>
                        ))
                      ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div"
          count={batches.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Card>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Purchase Batch"
        message="Are you sure you want to delete this purchase batch? All items in this batch will be removed and stock reversed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />

      <ConfirmDialog
        open={restoreDialog.open}
        title="Restore Purchase Batch"
        message="Are you sure you want to restore this deleted purchase? The items will be re-added and stock adjusted back."
        confirmLabel="Restore"
        loadingLabel="Restoring..."
        confirmColor="primary"
        onConfirm={handleRestore}
        onCancel={() => setRestoreDialog({ open: false, item: null })}
        loading={restoring}
      />

      <Dialog
        open={billDialog.open}
        onClose={closeBill}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Bill — {billDialog.fileName || "..."}</DialogTitle>
        <DialogContent
          dividers
          sx={{
            minHeight: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {billDialog.url &&
            (billDialog.mimeType === "application/pdf" ? (
              <Box
                component="iframe"
                src={billDialog.url}
                title="bill"
                sx={{ width: "100%", height: 560, border: "none" }}
              />
            ) : (
              <Box
                component="img"
                src={billDialog.url}
                alt="bill"
                sx={{ maxWidth: "100%", maxHeight: 560, objectFit: "contain" }}
              />
            ))}
        </DialogContent>
        <DialogActions>
          {billDialog.url && (
            <Button
              component="a"
              href={billDialog.url}
              download={billDialog.fileName}
              size="small"
            >
              Download
            </Button>
          )}
          <Button onClick={closeBill}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
