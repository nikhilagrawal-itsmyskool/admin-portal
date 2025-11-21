// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // A standard blue
    },
    secondary: {
      main: '#dc004e', // A standard pink
    },
    success: {
        main: '#4caf50', // Green for Add
    },
    error: {
        main: '#f44336', // Red for Delete
    }
  },
  typography: {
    h4: {
      fontWeight: 600,
      marginBottom: '1rem',
    }
  },
});

export default theme;