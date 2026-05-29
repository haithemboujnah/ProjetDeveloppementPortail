import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaTimes, FaGamepad, FaStar } from 'react-icons/fa';
import './SearchBar.css';

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      
      setLoading(true);
      try {
        // Appel API pour les suggestions
        const response = await fetch(`http://localhost:8000/api/games/search/?search=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        const gamesArray = Array.isArray(data) ? data : data.results || data.games || [];
        setSuggestions(gamesArray.slice(0, 5)); // Limiter à 5 suggestions
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      onSearch(searchTerm);
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSuggestionClick = (game) => {
    setSearchTerm(game.title);
    setShowSuggestions(false);
    navigate(`/game/${game.id}`);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSuggestions([]);
    onSearch('');
  };

  const renderRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} color="#ffc107" size={12} />);
    }
    for (let i = fullStars; i < 5; i++) {
      stars.push(<FaStar key={i} color="#e4e5e9" size={12} />);
    }
    return stars;
  };

  return (
    <div className="search-container" ref={searchRef}>
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Search games by title, genre, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => searchTerm.trim() && setShowSuggestions(true)}
          className="search-input"
        />
        {searchTerm && (
          <button className="clear-search" onClick={clearSearch}>
            <FaTimes />
          </button>
        )}
        <button onClick={handleSearch} className="search-button">
          Search
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          <div className="suggestions-header">
            <FaGamepad /> Games similar to "{searchTerm}"
          </div>
          {suggestions.map(game => (
            <div 
              key={game.id} 
              className="suggestion-item"
              onClick={() => handleSuggestionClick(game)}
            >
              <img 
                src={game.cover_image || 'https://via.placeholder.com/50'} 
                alt={game.title}
                className="suggestion-image"
              />
              <div className="suggestion-info">
                <div className="suggestion-title">{game.title}</div>
                <div className="suggestion-rating">
                  {renderRating(game.average_rating)}
                  <span className="rating-count">({game.total_ratings || 0})</span>
                </div>
                <div className="suggestion-price">${game.discount_price || game.price}</div>
                {game.categories && game.categories.length > 0 && (
                  <div className="suggestion-categories">
                    {game.categories.slice(0, 2).map(cat => (
                      <span key={cat.id} className="category-tag">{cat.name}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="suggestions-footer">
            <button onClick={handleSearch} className="view-all-btn">
              View all results for "{searchTerm}"
            </button>
          </div>
        </div>
      )}

      {showSuggestions && loading && (
        <div className="suggestions-loading">
          <div className="spinner-small"></div>
          Searching...
        </div>
      )}
    </div>
  );
};

export default SearchBar;