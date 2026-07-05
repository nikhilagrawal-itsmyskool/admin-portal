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

api.interceptors.request.use(
  (config) => {
    config.headers['X-School-Code'] = getSchoolCode();

    const token = localStorage.getItem('auth_token');
    if (token) {
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
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
