import axios from 'axios';

const instance = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

const getCookie = (name) => {
  if (typeof document === 'undefined') return '';
  const n = `${name}=`;
  const parts = String(document.cookie || '').split(';');
  for (const p of parts) {
    const s = p.trim();
    if (s.startsWith(n)) return decodeURIComponent(s.slice(n.length));
  }
  return '';
};

instance.interceptors.request.use((config) => {

  // Normalize common mistake: passing '/api/...' while baseURL is already '/api'
  // would otherwise produce '/api/api/...'.
  try {
    const base = String(config?.baseURL ?? instance.defaults.baseURL ?? '').replace(/\/$/, '');
    const url = String(config?.url ?? '');
    if (base.endsWith('/api') && url && !/^https?:\/\//i.test(url)) {
      if (url === '/api') config.url = '/';
      else if (url.startsWith('/api/')) config.url = url.slice('/api'.length);
    }
  } catch {
    // ignore
  }

  const token = getCookie('csrf_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    const code = error?.response?.data?.code;
    if (original && !original.__csrfRetry && code === 'CSRF_INVALID') {
      original.__csrfRetry = true;
      try {
        await instance.get('/auth/csrf');
      } catch {
        // ignore, will rethrow original error below
      }
      const token = getCookie('csrf_token');
      if (token) {
        original.headers = original.headers || {};
        original.headers['X-CSRF-Token'] = token;
      }
      return instance(original);
    }
    return Promise.reject(error);
  }
);

export default instance;
