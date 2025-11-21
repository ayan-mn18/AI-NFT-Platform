import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, RegisterRequest, VerifyEmailRequest, LoginRequest } from '@/types/auth';
import { authService } from '@/services/auth.service';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (data: RegisterRequest) => Promise<void>;
  verifyEmail: (data: VerifyEmailRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // We can't use useNavigate here directly if AuthProvider is outside BrowserRouter
  // So we might need to handle navigation in the components or move AuthProvider inside BrowserRouter in App.tsx

  useEffect(() => {
    // Check localStorage for persisted user state on mount
    const storedUser = localStorage.getItem('aura_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from local storage", e);
        localStorage.removeItem('aura_user');
      }
    }
    setIsLoading(false);
  }, []);

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authService.register(data);
      // Registration usually doesn't log you in immediately if email verification is required
      // But we might want to store the email temporarily for the verification step
      toast.success(response.message || 'Registration successful! Please verify your email.');
      // We don't set user here yet, as they need to verify email
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const verifyEmail = async (data: VerifyEmailRequest) => {
    try {
      const response = await authService.verifyEmail(data);
      setUser(response.data);
      localStorage.setItem('aura_user', JSON.stringify(response.data));
      toast.success('Email verified! You are now logged in.');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
      throw error;
    }
  };

  const login = async (data: LoginRequest) => {
    try {
      const response = await authService.login(data);
      setUser(response.data);
      localStorage.setItem('aura_user', JSON.stringify(response.data));
      toast.success('Welcome back!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      localStorage.removeItem('aura_user');
      toast.success('Logged out successfully');
    } catch (error: any) {
      console.error('Logout error', error);
      // Force logout on client side even if server fails
      setUser(null);
      localStorage.removeItem('aura_user');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      register,
      verifyEmail,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
