import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          console.log('Current user loaded:', currentUser);
          console.log('User role:', currentUser.role);
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const userData = await authService.login(credentials);
      console.log('Login successful:', userData);
      console.log('User role after login:', userData.role);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const register = async (userData) => {
    try {
      await authService.register(userData);
    } catch (error) {
      throw error;
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    // Mettre à jour le localStorage
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...updatedUser }));
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser: updateUser,
      login, 
      logout, 
      register, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};