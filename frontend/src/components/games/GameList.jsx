import React, { useState, useEffect } from 'react';
import { gameService } from '../../services/game';
import GameCard from './GameCard';
import SearchBar from './SearchBar';
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

  const handleSearch = async (query) => {
    setSearchTerm(query);
    
    if (!query.trim()) {
      fetchGames();
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await gameService.searchGames(query);
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

  return (
    <div className="container">
      <div className="search-section">
        <SearchBar onSearch={handleSearch} />
      </div>
      
      {searchTerm && (
        <div className="search-results-info">
          <h3>Search results for: <span className="search-term">"{searchTerm}"</span></h3>
          <p>Found {games.length} game(s)</p>
        </div>
      )}
      
      {!games || games.length === 0 ? (
        <div className="no-results">
          <h2>No games found</h2>
          <p>Try adjusting your search or check back later for new games!</p>
          <button onClick={fetchGames} className="btn btn-primary">
            Clear Search
          </button>
        </div>
      ) : (
        <div className="games-grid">
          {games.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GameList;