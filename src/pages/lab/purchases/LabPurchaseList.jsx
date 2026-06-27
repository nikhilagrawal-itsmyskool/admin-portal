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
  FormControlLabel,
  Checkbox,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  LinearProgress,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  RestoreFromTrash as RestoreIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AttachFile as AttachFileIcon,
} from "@mui/icons-material";
import { labService } from "../../../services/labService";
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

export default function LabPurchaseList() {
  const navigate = useNavigate();
  const can = useCan();
  const canEditPurchase = can(ACTIONS.PURCHASE_LOG_EDIT);
  const canRestorePurchase = can(ACTIONS.PURCHASE_LOG_RESTORE);
  const [searchParams, setSearchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [labs, setLabs] = useState([]);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [deleting, setDeleting] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState({
    open: false,
    item: null,
  });
  const [restoring, setRestoring] = useState(false);
  const [billDialog, setBillDialog] = useState({
    open: false,
    url: null,
    mimeType: null,
    fileName: null,
  });

  // Filter state
  const [selectedLab, setSelectedLab] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Show/hide additional detail columns
  const [showDetails, setShowDetails] = useState(false);

  // Expandable rows
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [batchItemsCache, setBatchItemsCache] = useState({});
  const [expandLoading, setExpandLoading] = useState(new Set());

  useEffect(() => {
    loadLabsAndItems();
  }, []);

  useEffect(() => {
    if (labs.length === 0 && items.length === 0) return;

    const labId = searchParams.get("lab");
    const itemId = searchParams.get("item");
    const overrides = {};

    if (labId) {
      const lab = labs.find((l) => l.uuid === labId);
      if (lab) {
        setSelectedLab(lab);
        setFilteredItems(items.filter((i) => i.labId === labId));
        overrides.labId = labId;
      }
    }
    if (itemId) {
      const item = items.find((i) => i.uuid === itemId);
      if (item) {
        setSelectedItem(item);
        overrides.itemId = itemId;
      }
    }

    loadBatchesWithFilters(overrides);
  }, [labs, items]);

  const loadLabsAndItems = async () => {
    try {
      const [labsData, itemsData] = await Promise.all([
        labService.getLabs(),
        labService.getItems(),
      ]);
      setLabs(labsData);
      setItems(itemsData);
      setFilteredItems(itemsData);
    } catch (err) {
      console.error("Failed to load labs/items:", err);
    }
  };

  const loadBatchesWithFilters = async (overrideFilters = {}) => {
    setLoading(true);
    setError("");
    setExpandedRows(new Set());
    try {
      const filters = { ...overrideFilters };
      if (!filters.labId && selectedLab) filters.labId = selectedLab.uuid;
      if (!filters.itemId && selectedItem) filters.itemId = selectedItem.uuid;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (includeDeleted) filters.includeDeleted = true;

      const data = await labService.getPurchaseBatches(filters);
      setBatches(data);
      setPage(0);
    } catch (err) {
      setError("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  const handleLabChange = (_, newValue) => {
    setSelectedLab(newValue);
    setSelectedItem(null);
    setFilteredItems(
      newValue ? items.filter((i) => i.labId === newValue.uuid) : items,
    );
  };

  const handleSearch = () => loadBatchesWithFilters();

  const handleClear = () => {
    setSelectedLab(null);
    setSelectedItem(null);
    setStartDate("");
    setEndDate("");
    setIncludeDeleted(false);
    setFilteredItems(items);
    setSearchParams({});
    setBatches([]);
    setLoading(true);
    labService
      .getPurchaseBatches({})
      .then((data) => {
        setBatches(data);
        setPage(0);
      })
      .catch(() => setError("Failed to load purchases"))
      .finally(() => setLoading(false));
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
        const batch = await labService.getPurchaseBatchById(uuid);
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const row = deleteDialog.item;
      if (row.recordType === "batch") {
        await labService.deletePurchaseBatch(row.uuid);
      } else {
        await labService.deletePurchase(row.uuid);
      }
      setDeleteDialog({ open: false, item: null });
      loadBatchesWithFilters();
    } catch {
      setError("Failed to delete purchase");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await labService.restorePurchaseBatch(restoreDialog.item.uuid);
      setRestoreDialog({ open: false, item: null });
      loadBatchesWithFilters();
    } catch {
      setError("Failed to restore purchase");
    } finally {
      setRestoring(false);
    }
  };

  const openBill = async (batchId) => {
    try {
      const file = await labService.getLabBill(batchId);
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

  const paginatedBatches = batches.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const deletedRowSx = {
    opacity: 0.6,
    backgroundColor: "rgba(244, 67, 54, 0.04)",
    "& td:not(:first-of-type):not(:last-of-type)": {
      textDecoration: "line-through",
    },
  };

  const expandedItemSx = {
    backgroundColor: "rgba(0,0,0,0.03)",
    "& td:first-of-type": {
      borderLeft: "3px solid",
      borderColor: "primary.light",
    },
  };

  const expandedItemDeletedSx = {
    ...expandedItemSx,
    opacity: 0.6,
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
        <Typography variant="h4">Lab Purchase Log</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate("/lab/purchases/bulk/add")}
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
            <Grid item xs={12} md={2.5}>
              <Autocomplete
                options={labs}
                getOptionLabel={(option) => option.name}
                value={selectedLab}
                onChange={handleLabChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Lab"
                    size="small"
                    placeholder="All Labs"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={2.5}>
              <Autocomplete
                options={filteredItems}
                getOptionLabel={(option) => option.name}
                value={selectedItem}
                onChange={(_, val) => setSelectedItem(val)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Item"
                    size="small"
                    placeholder="All Items"
                  />
                )}
              />
            </Grid>
            <Grid item xs={6} md={1.5}>
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
            <Grid item xs={6} md={1.5}>
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
            <Grid item xs={12} md={1.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeDeleted}
                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                    size="small"
                  />
                }
                label="Deleted"
                sx={{
                  "& .MuiFormControlLabel-label": { fontSize: "0.875rem" },
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  size="small"
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={handleClear}
                  size="small"
                >
                  Clear
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
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
        {loading && <LinearProgress />}
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{ "& th": { fontWeight: 600, whiteSpace: "nowrap" } }}
              >
                <TableCell sx={{ width: 40 }} />
                <TableCell>Date</TableCell>
                <TableCell>Lab</TableCell>
                <TableCell>Items</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Cost/Unit</TableCell>
                <TableCell align="right">Total (₹)</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell align="center" sx={{ width: 56 }}>
                  Bills
                </TableCell>
                {showDetails && <TableCell>Invoice No</TableCell>}
                {showDetails && <TableCell>Batch No</TableCell>}
                {showDetails && <TableCell>Expiry</TableCell>}
                {showDetails && <TableCell>Warranty End</TableCell>}
                <TableCell align="center" sx={{ width: 56 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && paginatedBatches.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={showDetails ? 14 : 10}
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

                return (
                  <React.Fragment key={row.uuid}>
                    {/* Main row */}
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
                      <TableCell>{row.labName || "—"}</TableCell>
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
                            {row.itemName || "—"}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{row.quantity ?? "—"}</TableCell>
                      <TableCell align="right">
                        {canExpand
                          ? "—"
                          : row.costPerUnit != null
                            ? formatCurrency(row.costPerUnit)
                            : "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        {row.totalCost != null
                          ? parseFloat(row.totalCost).toFixed(2)
                          : "—"}
                      </TableCell>
                      <TableCell>{row.supplier || "—"}</TableCell>
                      <TableCell align="center">
                        {row.fileId && (
                          <Tooltip title="View bill">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openBill(row.uuid)}
                            >
                              <AttachFileIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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
                      {showDetails && (
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {formatDate(row.warrantyEndDate)}
                        </TableCell>
                      )}
                      <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                        {!isDeleted && canEditPurchase && (
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() =>
                                navigate(`/lab/purchases/bulk/${row.uuid}/edit`)
                              }
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!isDeleted && (
                          <Tooltip title="Delete">
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

                    {/* Loading row while fetching batch items */}
                    {canExpand && isExpandLoading && (
                      <TableRow key={row.uuid + "_loading"}>
                        <TableCell
                          colSpan={showDetails ? 14 : 10}
                          sx={{ py: 0, px: 0 }}
                        >
                          <LinearProgress />
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Expanded item rows — inline, same columns as parent */}
                    {canExpand &&
                      isExpanded &&
                      !isExpandLoading &&
                      (batchItemsCache[row.uuid] || []).map((item) => (
                        <TableRow
                          key={item.uuid}
                          sx={
                            isDeleted ? expandedItemDeletedSx : expandedItemSx
                          }
                        >
                          <TableCell sx={{ pr: 0 }} />
                          <TableCell />
                          <TableCell>{item.labName || "—"}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {item.itemName || item.itemId}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.costPerUnit)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ whiteSpace: "nowrap" }}
                          >
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
                          {showDetails && (
                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                              {formatDate(item.warrantyEndDate)}
                            </TableCell>
                          )}
                          <TableCell />
                        </TableRow>
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
        title={
          deleteDialog.item?.recordType === "batch"
            ? "Delete Purchase Batch"
            : "Delete Purchase"
        }
        message={
          deleteDialog.item?.recordType === "batch"
            ? "Are you sure you want to delete this purchase batch? All items will be removed and stock reversed."
            : "Are you sure you want to delete this purchase record? This will also adjust the inventory stock."
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, item: null })}
        loading={deleting}
      />

      <ConfirmDialog
        open={restoreDialog.open}
        title={
          restoreDialog.item?.recordType === "batch"
            ? "Restore Purchase Batch"
            : "Restore Purchase"
        }
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
