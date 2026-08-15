import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function getSchoolCode() {
  const hostname = window.location.hostname;
  // Match dbpasn.admin.itsmyskool.com or dbpasn.itsmyskool.com
  if (hostname.includes('.admin.itsmyskool.com') || hostname.endsWith('.itsmyskool.com')) {
    const subdomain = hostname.split('.')[0];
    // Ignore www or empty subdomains
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      return subdomain;
    }
  }
  // Non-school host (e.g. the Amplify *.amplifyapp.com preview URL): use a stored
  // code, else prompt once and remember it. Lets us verify a specific school's
  // deployment in parallel without touching its live schoolCode.itsmyskool.com host.
  let code = localStorage.getItem('school_code_override');
  if (!code) {
    code = window.prompt('Enter school code');
    if (code) localStorage.setItem('school_code_override', code);
  }
  return code || import.meta.env.VITE_SCHOOL_CODE || 'demo';
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// The JWT is an 8h token (JWT_ADMIN_EXPIRY_TIME). The app used to keep users
// "logged in" by token presence alone, so an expired token was still sent and the
// backend — which now verifies it (e.g. contact masking) — silently treated the
// caller as unprivileged. Detect an expired `exp` up front and force a re-login
// instead of sending a dead token.
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp && payload.exp * 1000 <= Date.now();
  } catch {
    return false; // unparseable — let the server decide
  }
}

api.interceptors.request.use(
  (config) => {
    config.headers['X-School-Code'] = getSchoolCode();

    const token = localStorage.getItem('auth_token');
    if (token) {
      if (isTokenExpired(token)) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(new Error('Session expired — please sign in again'));
      }
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from an authenticated call means the session died — bounce to login.
    // But a 401 FROM the login attempt itself (bad password, lockout, bot check)
    // must fall through so the login page can show the message instead of reloading.
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
