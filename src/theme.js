import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3366ff',
      light: '#598bff',
      dark: '#274bdb',
    },
    secondary: {
      main: '#ff3d71',
    },
    background: {
      default: '#edf1f7',
      paper: '#ffffff',
    },
    sidebar: {
      background: '#222b45',
      text: '#8f9bb3',
      textActive: '#ffffff',
      hover: '#1a2138',
    },
  },
  typography: {
    fontFamily: '"Open Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 0.5rem 1rem 0 rgba(44, 51, 73, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 4,
        },
      },
    },
  },
});

export default theme;
