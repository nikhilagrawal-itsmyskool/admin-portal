import React from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent, Icon } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarningIcon from '@mui/icons-material/Warning';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useData } from '../context/data-context'; // Import your data hook

// --- Utility Function to calculate mock KPIs ---
const calculateKpis = (stockRecords) => {
    // ⚠️ For mocking purposes:
    const LOW_STOCK_THRESHOLD = 500;
    const NEAR_EXPIRY_DAYS = 180; // 6 months

    // Count low stock items
    const lowStockCount = stockRecords.filter(item => item.quantity < LOW_STOCK_THRESHOLD).length;

    // Count near expiry items
    const today = new Date();
    const expiryThreshold = new Date(today);
    expiryThreshold.setDate(today.getDate() + NEAR_EXPIRY_DAYS);

    const nearExpiryCount = stockRecords.filter(item => {
        const expiryDate = new Date(item.expiry);
        return expiryDate < expiryThreshold;
    }).length;

    return {
        totalItems: stockRecords.length,
        lowStockCount,
        nearExpiryCount,
    };
};

// --- Reusable KPI Card Component ---
const KpiCard = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%', borderLeft: `5px solid ${color}`, boxShadow: 3 }}>
        <CardContent>
            <Grid container spacing={2} alignItems="center">
                <Grid item>
                    <Icon component={icon} sx={{ fontSize: 40, color: color }} />
                </Grid>
                <Grid item>
                    <Typography color="textSecondary" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h5" component="div">
                        {value}
                    </Typography>
                </Grid>
            </Grid>
        </CardContent>
    </Card>
);


const Dashboard = () => {
    // 1. Get the stock records from the global context
    const { stockRecords } = useData();
    
    // 2. Calculate the Key Performance Indicators (KPIs)
    const kpis = calculateKpis(stockRecords);

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Dashboard Overview
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Total Distinct Items Card */}
                <Grid item xs={12} sm={4}>
                    <KpiCard 
                        title="Total Distinct Medicines" 
                        value={kpis.totalItems}
                        icon={Inventory2Icon}
                        color="#1976d2" // Primary blue
                    />
                </Grid>

                {/* Low Stock Warning Card */}
                <Grid item xs={12} sm={4}>
                    <KpiCard 
                        title="Low Stock Warnings" 
                        value={kpis.lowStockCount}
                        icon={WarningIcon}
                        color="#f57c00" // Warning orange
                    />
                </Grid>

                {/* Near Expiry Card */}
                <Grid item xs={12} sm={4}>
                    <KpiCard 
                        title="Near Expiry Batches" 
                        value={kpis.nearExpiryCount}
                        icon={AccessTimeIcon}
                        color="#d32f2f" // Error red
                    />
                </Grid>
            </Grid>

            {/* Placeholder for Recent Activity or Graphs */}
            <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Recent Stock Activity
                </Typography>
                <Typography variant="body1">
                    This area is reserved for charts, recent logs, or quick links.
                </Typography>
            </Paper>
        </Box>
    );
};

export default Dashboard;