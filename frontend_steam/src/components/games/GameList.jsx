import React, { useState, useEffect } from 'react';
import { gameService } from '../../services/game';
import GameCard from './GameCard';
import LoadingSpinner from '../common/LoadingSpinner';
import './GameList.css';

const GameList = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gameService.getAllGames();
      
      // Vérifier si data est un tableau, sinon le convertir
      const gamesArray = Array.isArray(data) ? data : data.results || data.games || [];
      setGames(gamesArray);
    } catch (error) {
      console.error('Failed to fetch games:', error);
      setError('Failed to load games. Please try again later.');
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      fetchGames();
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await gameService.searchGames(searchTerm);
      const gamesArray = Array.isArray(data) ? data : data.results || data.games || [];
      setGames(gamesArray);
    } catch (error) {
      console.error('Search failed:', error);
      setError('Search failed. Please try again.');
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchGames} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>No games found</h2>
        <p>Try adjusting your search or check back later for new games!</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="search-section">
        <input
          type="text"
          placeholder="Search games..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="search-input"
        />
        <button onClick={handleSearch} className="btn btn-primary">
          Search
        </button>
      </div>
      <div className="games-grid">
        {games.map(game => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
};

export default GameList;