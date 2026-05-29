import api from './api';
import toast from 'react-hot-toast';

export const authService = {
  async register(userData) {
    try {
      const response = await api.post('/users/register/', userData);
      console.log('Registration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Registration failed';
      toast.error(errorMessage);
      throw error;
    }
  },

  async login(credentials) {
    try {
      const response = await api.post('/users/login/', credentials);
      console.log('Login response:', response.data);
      
      const { access, refresh, user } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Login failed';
      toast.error(errorMessage);
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  },
};