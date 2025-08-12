import { apiRequest } from './queryClient';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    const response = await apiRequest('POST', '/api/auth/login', credentials);
    return response.json();
  },

  register: async (userData: RegisterData) => {
    const response = await apiRequest('POST', '/api/auth/register', userData);
    return response.json();
  },

  getCurrentUser: async () => {
    const response = await apiRequest('GET', '/api/auth/me');
    return response.json();
  },

  logout: () => {
    localStorage.removeItem('token');
  },
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('token');
};
