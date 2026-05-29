import React, { useState } from 'react';
import { FaFilter, FaTimes, FaSort, FaTag, FaStar } from 'react-icons/fa';
import './GameFilters.css';

const GameFilters = ({ filters, onFilterChange, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePriceChange = (type, value) => {
    onFilterChange({
      ...filters,
      price: {
        ...filters.price,
        [type]: value
      }
    });
  };

  const handleCategoryChange = (category) => {
    onFilterChange({
      ...filters,
      category: category === filters.category ? 'all' : category
    });
  };

  const handleSortChange = (sort) => {
    onFilterChange({
      ...filters,
      sortBy: sort
    });
  };

  const handleRatingChange = (rating) => {
    onFilterChange({
      ...filters,
      minRating: rating
    });
  };

  return (
    <div className="game-filters">
      <button className="filter-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        <FaFilter /> Filters
        {Object.keys(filters).some(key => 
          key === 'category' && filters.category !== 'all' ||
          key === 'sortBy' && filters.sortBy !== 'relevance' ||
          key === 'minRating' && filters.minRating > 0 ||
          (filters.price?.min > 0 || filters.price?.max > 0)
        ) && <span className="filter-badge">●</span>}
      </button>

      <div className={`filter-panel ${isOpen ? 'open' : ''}`}>
        <div className="filter-header">
          <h3>Filter Games</h3>
          <button className="close-filters" onClick={() => setIsOpen(false)}>
            <FaTimes />
          </button>
        </div>

        <div className="filter-section">
          <h4><FaSort /> Sort By</h4>
          <div className="sort-options">
            {['relevance', 'newest', 'price_asc', 'price_desc', 'rating'].map(option => (
              <button
                key={option}
                className={`sort-option ${filters.sortBy === option ? 'active' : ''}`}
                onClick={() => handleSortChange(option)}
              >
                {option === 'relevance' && 'Most Relevant'}
                {option === 'newest' && 'Newest First'}
                {option === 'price_asc' && 'Price: Low to High'}
                {option === 'price_desc' && 'Price: High to Low'}
                {option === 'rating' && 'Top Rated'}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h4><FaTag /> Price Range</h4>
          <div className="price-range">
            <input
              type="number"
              placeholder="Min"
              value={filters.price?.min || ''}
              onChange={(e) => handlePriceChange('min', e.target.value)}
              className="price-input"
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.price?.max || ''}
              onChange={(e) => handlePriceChange('max', e.target.value)}
              className="price-input"
            />
          </div>
        </div>

        <div className="filter-section">
          <h4><FaStar /> Minimum Rating</h4>
          <div className="rating-filter">
            {[1, 2, 3, 4, 5].map(rating => (
              <button
                key={rating}
                className={`rating-star ${filters.minRating >= rating ? 'active' : ''}`}
                onClick={() => handleRatingChange(rating)}
              >
                {rating}★
              </button>
            ))}
          </div>
        </div>

        <button className="reset-filters-btn" onClick={onReset}>
          Reset All Filters
        </button>
      </div>
    </div>
  );
};

export default GameFilters;