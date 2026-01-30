# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Admin portal for ItsMySkool school management system. React + Material UI application with ngx-admin style layout (dark sidebar, light content area).

## Commands

```bash
npm install            # Install dependencies

# Development servers
npm run start:local    # Local dev → hits localhost:3000 API
npm run start:dev      # Dev server → hits api.dev.itsmyskool.com

# Build
npm run build:dev      # Build for dev environment
npm run build:prod     # Build for production

# Preview/Serve built files
npm run preview:local  # Serve built files on port 4173
npm run preview:prod   # Serve built files on port 8080
npm run serve:prod     # Build + serve on port 8080 (one command)

# Testing (Playwright)
npm test               # Run all tests headless
npm run test:headed    # Run tests with browser visible
npm run test:ui        # Open Playwright UI for debugging
```

## Environments

| Environment | Command | API URL | Env File |
|-------------|---------|---------|----------|
| Local | `npm run start:local` | localhost:3000 | `.env.localhost` |
| Development | `npm run start:dev` | api.dev.itsmyskool.com | `.env.development` |
| Production | `npm run build:prod` | api.itsmyskool.com | `.env.production` |

**Files**:
- `.env.localhost` - Local settings (gitignored, create your own)
- `.env.development` - Dev server URLs (committed)
- `.env.production` - Production URLs (committed)

**Variables**:
```
VITE_API_BASE_URL=<api-url>
VITE_SCHOOL_CODE=<code>    # Only needed for local (no subdomain)
```

## Architecture

### Project Structure
```
src/
├── config/api.js           # Axios instance, school code extraction
├── context/AuthContext.jsx # Auth state, login/logout, JWT handling
├── layouts/MainLayout.jsx  # App shell (sidebar + header + content)
├── components/
│   ├── Sidebar.jsx         # Left navigation with expandable menus
│   ├── Header.jsx          # Top bar with user dropdown
│   └── ProtectedRoute.jsx  # Auth guard for routes
├── pages/
│   ├── Login.jsx           # Standalone login page
│   ├── Dashboard.jsx       # Home dashboard
│   └── medical/            # Medical module pages
├── services/               # API service functions
└── theme.js               # MUI theme configuration
```

### Key Patterns

**School Code Resolution** (`src/config/api.js`):
- Production: Extracted from subdomain (`dbpasn.admin.itsmyskool.com` → `dbpasn`)
- Local dev: Falls back to `VITE_SCHOOL_CODE` env variable
- All API calls include `X-School-Code` header automatically

**Authentication Flow**:
- Login calls `/auth/employee/login` with username/password
- JWT token stored in localStorage
- Token automatically attached to API requests via axios interceptor
- 401 responses trigger automatic logout and redirect to login

**Adding New Modules**:
1. Add menu item in `src/components/Sidebar.jsx` menuItems array
2. Create pages under `src/pages/<module-name>/`
3. Add routes in `src/App.jsx`
4. Create service file in `src/services/<module>Service.js`

### API Integration

Backend: `../core-api/modules/` (sibling directory)

Available endpoints:
- **Auth**: `/auth/employee/login`
- **Medical**: `/medical/items`, `/medical/purchases`, `/medical/issues`, `/medical/units`

API response format:
```javascript
// Success: { data: ... }
// Error: { error: { code: "ERROR_CODE", description: "message" } }
```

## Tech Stack

- React 18 with Vite
- Material UI v5 + MUI X Data Grid
- React Router v6
- Axios for HTTP
