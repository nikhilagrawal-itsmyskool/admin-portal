# Technology Stack Summary — Admin Portal

React + Vite admin portal for the ItsMySkool school management system.

## Core Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 18.2 |
| Build Tool | Vite | 5.2 |
| Component Library | Material UI | 5.15 |
| Data Grid | MUI X Data Grid | 7.1 |
| Routing | React Router | 6.22 |
| HTTP Client | Axios | 1.7 |

## Styling

- **CSS-in-JS**: Emotion (via MUI's `@emotion/react` + `@emotion/styled`)
- **Theme**: Custom MUI theme — Open Sans font, dark sidebar / light content layout

## State Management

- **React Context API** — `AuthContext` handles JWT-based auth state (login, logout, token refresh)
- No external state library (Redux, Zustand, etc.)

## API Integration

- REST over Axios with automatic request interceptors
- Every request includes `Authorization` (JWT) and `X-School-Code` headers
- School code resolved from subdomain in production, env variable locally

## Environment Configuration

| Config | API Target | Env File |
|--------|-----------|----------|
| Local | localhost:3000 | `.env.localhost` |
| Dev | api.dev.itsmyskool.com | `.env.development` |
| Prod | api.itsmyskool.com | `.env.production` |

Managed via `dotenv` + `cross-env`.

## Testing

- **Playwright** (E2E, Chromium) — `npm test` / `npm run test:ui`

## Linting

- **ESLint 8** with `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

## Language

- **JavaScript (JSX)** — no TypeScript in source code
