import axios from 'axios';
import type { User, Subscription, DashboardData, Category } from '../types';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const isAuthUrl = (url?: string) => url?.startsWith('/auth/login') || url?.startsWith('/auth/register');

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !isAuthUrl(err.config?.url)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }).then((r) => r.data),
  register: (email: string, password: string, name: string) =>
    api.post<{ token: string; user: User }>('/auth/register', { email, password, name }).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
};

export const subscriptionApi = {
  list: () => api.get<Subscription[]>('/subscriptions').then((r) => r.data),
  get: (id: number) => api.get<Subscription>(`/subscriptions/${id}`).then((r) => r.data),
  create: (data: Partial<Subscription>) =>
    api.post<Subscription>('/subscriptions', data).then((r) => r.data),
  update: (id: number, data: Partial<Subscription>) =>
    api.put<Subscription>(`/subscriptions/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/subscriptions/${id}`).then((r) => r.data),
  toggleReview: (id: number) =>
    api.patch<Subscription>(`/subscriptions/${id}/review`).then((r) => r.data),
};

export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard').then((r) => r.data),
};

export const categoryApi = {
  list: () => api.get<Category[]>('/categories').then((r) => r.data),
};

export const exportApi = {
  csv: async (startDate?: string, endDate?: string) => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await api.get('/export/csv', { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions${startDate ? '_' + startDate : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  pdf: async (startDate?: string, endDate?: string) => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await api.get('/export/pdf', { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions${startDate ? '_' + startDate : ''}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export const notificationApi = {
  testEmail: () => api.post('/notifications/test-email').then((r) => r.data),
};
