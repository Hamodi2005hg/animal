export const getToken = () => localStorage.getItem('sos_token');
export const setToken = (token: string) => localStorage.setItem('sos_token', token);
export const removeToken = () => localStorage.removeItem('sos_token');

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || 'An error occurred');
  }

  return data;
};
