import api from '@/lib/axios';
import type { RegisterRequest, VerifyEmailRequest, LoginRequest, AuthResponse } from '@/types/auth';

export const authService = {
  register: async (data: RegisterRequest) => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  verifyEmail: async (data: VerifyEmailRequest) => {
    const response = await api.post<AuthResponse>('/auth/verify-email', data);
    return response.data;
  },

  login: async (data: LoginRequest) => {
    const response = await api.post<AuthResponse>('/auth/signin', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // Helper to check if user is authenticated (optional, usually done via a /me endpoint)
  // For now, we might rely on local state or a check-auth endpoint if it existed.
  // Since we use cookies, we might need a /users/me endpoint to persist session on reload.
  // I'll assume for now we persist state in memory or localStorage (less secure but common for MVP)
  // OR better: add a checkAuth method if the backend supports it.
  // Looking at backend routes, I don't see a specific /me endpoint in the summary, 
  // but I can probably use any protected route to check validity.
};
