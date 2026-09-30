const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

const request = async (path, options = {}) => {
  const tokenKey = path.startsWith('/admin') ? 'admin_token' : 'customer_token';
  const token = localStorage.getItem(tokenKey);
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.code = data.code || '';
    error.status = response.status;
    throw error;
  }
  return data;
};

const requestWithProgress = (path, method, body, onProgress) => new Promise((resolve, reject) => {
  const tokenKey = path.startsWith('/admin') ? 'admin_token' : 'customer_token';
  const token = localStorage.getItem(tokenKey);
  const xhr = new XMLHttpRequest();
  xhr.open(method, `${API_BASE_URL}${path}`);
  xhr.timeout = 0;
  if (!(body instanceof FormData)) xhr.setRequestHeader('Content-Type', 'application/json');
  if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.upload.addEventListener('progress', (event) => {
    onProgress?.({ loaded: event.loaded, total: event.total, lengthComputable: event.lengthComputable });
  });
  xhr.addEventListener('load', () => {
    let data = {};
    try { data = JSON.parse(xhr.responseText || '{}'); } catch {}
    if (xhr.status < 200 || xhr.status >= 300) {
      const error = new Error(data.message || 'Upload failed');
      error.code = data.code || '';
      error.status = xhr.status;
      reject(error);
      return;
    }
    resolve(data);
  });
  xhr.addEventListener('error', () => reject(new Error('Upload connection failed. Check your connection and try again.')));
  xhr.addEventListener('abort', () => reject(new Error('Upload was interrupted. You can retry without changing the original files.')));
  xhr.send(body instanceof FormData ? body : JSON.stringify(body));
});

export const api = {
  get: (path, params) => request(`${path}${buildQuery(params)}`),
  post: (path, body) =>
    request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (path, body) =>
    request(path, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  postWithProgress: (path, body, onProgress) => requestWithProgress(path, 'POST', body, onProgress),
  putWithProgress: (path, body, onProgress) => requestWithProgress(path, 'PUT', body, onProgress),
  del: (path) => request(path, { method: 'DELETE' }),
};

export default API_BASE_URL;
