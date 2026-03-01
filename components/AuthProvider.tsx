'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, businessName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        apiClient.setToken(storedToken);
      } catch (error) {
        console.error('Failed to parse stored user data', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      // Store token
      const accessToken = response.token;
      setToken(accessToken);
      apiClient.setToken(accessToken);
      localStorage.setItem('auth_token', accessToken);

      // Get user profile by decoding token or making another request
      // For now, we'll store basic info from the login response
      const userInfo: User = {
        id: '', // Will be populated from backend
        cognitoUserId: '',
        email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setUser(userInfo);
      localStorage.setItem('auth_user', JSON.stringify(userInfo));
    } catch (error: any) {
      console.error('Login failed', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, businessName?: string) => {
    try {
      await apiClient.register(email, password, businessName);
      
      // After registration, automatically log in
      await login(email, password);
    } catch (error: any) {
      console.error('Registration failed', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    apiClient.setToken('');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
