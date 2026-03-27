import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ne pas essayer de rafraîchir le token pour les requêtes non authentifiées
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/users/login/') {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken,
          });
          
          localStorage.setItem('access_token', response.data.access);
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Si le rafraîchissement échoue, déconnecter l'utilisateur
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Rediriger vers la page de login seulement si on n'y est pas déjà
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Afficher les erreurs uniquement pour les erreurs non 401 ou si ce n'est pas une erreur d'authentification
    if (error.response?.data?.error && error.response?.status !== 401) {
      toast.error(error.response.data.error);
    }

    return Promise.reject(error);
  }
);

export default api;