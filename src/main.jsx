// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import { CssBaseline, ThemeProvider } from '@mui/material';
import theme from './theme.js';
import { DataProvider } from './context/data-context.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
        <DataProvider>
            <App />
        </DataProvider>
    </ThemeProvider>
  </React.StrictMode>
);