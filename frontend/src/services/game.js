import api from './api';

// Fonction utilitaire pour normaliser les données des jeux
const normalizeGameData = (data) => {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && data.results) {
    return data.results;
  }
  if (data && data.games) {
    return data.games;
  }
  if (data && typeof data === 'object') {
    return Object.values(data);
  }
  return [];
};

export const gameService = {
  async getAllGames(params = {}) {
    try {
      const response = await api.get('/games/', { params });
      const games = Array.isArray(response.data) ? response.data : response.data.results || [];
      
      // S'assurer que chaque jeu a un tableau de catégories
      const gamesWithCategories = games.map(game => ({
        ...game,
        categories: game.categories || []
      }));
      
      console.log('Games loaded with categories:', gamesWithCategories);
      return gamesWithCategories;
    } catch (error) {
      console.error('Error fetching games:', error);
      throw error;
    }
  },

  async getGameById(id) {
    try {
      const response = await api.get(`/games/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching game details:', error);
      throw error;
    }
  },

  async searchGames(query) {
    try {
      const response = await api.get('/games/search/', { 
        params: { search: query } 
      });
      return normalizeGameData(response.data);
    } catch (error) {
      console.error('Error searching games:', error);
      throw error;
    }
  },

  async getFeaturedGames() {
    try {
      const response = await api.get('/games/featured/');
      return normalizeGameData(response.data);
    } catch (error) {
      console.error('Error fetching featured games:', error);
      throw error;
    }
  },

  async getUserLibrary() {
    try {
      const response = await api.get('/games/my-library/');
      console.log('Library API response:', response.data);
      return normalizeGameData(response.data);
    } catch (error) {
      console.error('Error fetching library:', error);
      return [];
    }
  },

  async addToWishlist(gameId) {
      try {
          // S'assurer que gameId est un nombre
          const gameIdNumber = parseInt(gameId);
          console.log('Sending to wishlist - gameId:', gameIdNumber);
          
          const response = await api.post('/games/wishlist/', { game: gameIdNumber });
          console.log('Wishlist response:', response.data);
          return response.data;
      } catch (error) {
          console.error('Error adding to wishlist:', error);
          console.error('Error response:', error.response);
          console.error('Error data:', error.response?.data);
          throw error;
      }
  },

  async removeFromWishlist(gameId) {
    try {
      const response = await api.delete(`/games/wishlist/${gameId}/remove/`);
      return response.data;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  },

  async getWishlist() {
    try {
      const response = await api.get('/games/wishlist/');
      console.log('Wishlist API response:', response.data);
      return normalizeGameData(response.data);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      return [];
    }
  },
};