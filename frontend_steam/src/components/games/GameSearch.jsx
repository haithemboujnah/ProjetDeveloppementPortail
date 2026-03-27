import React, { useState } from 'react';
import { gameService } from '../../services/game';
import GameCard from './GameCard';
import LoadingSpinner from '../common/LoadingSpinner';
import './GameSearch.css';

const GameSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    category: '',
    sortBy: 'relevance'
  });

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        min_price: filters.minPrice,
        max_price: filters.maxPrice,
        category: filters.category,
        ordering: filters.sortBy === 'price_asc' ? 'price' : 
                  filters.sortBy === 'price_desc' ? '-price' :
                  filters.sortBy === 'rating' ? '-average_rating' :
                  filters.sortBy === 'newest' ? '-release_date' : ''
      };
      const data = await gameService.getAllGames(params);
      setGames(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="game-search-container">
      <div className="search-header">
        <h1>Search Games</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by game title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button onClick={handleSearch} className="btn btn-primary">
            Search
          </button>
        </div>
      </div>

      <div className="search-filters">
        <div className="filter-group">
          <label>Price Range</label>
          <div className="price-range">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
          >
            <option value="relevance">Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        <button onClick={handleSearch} className="btn btn-secondary">
          Apply Filters
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="search-results-count">
            Found {games.length} games
          </div>
          <div className="games-grid">
            {games.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
          {games.length === 0 && searchTerm && (
            <div className="no-results">
              <h3>No games found</h3>
              <p>Try different search terms or browse our store</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GameSearch;