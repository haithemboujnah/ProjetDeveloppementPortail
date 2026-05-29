import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../../services/game';
import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaShoppingCart, FaHeart, FaStar, FaList, FaTh, FaFilter, FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './UserDashboard.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  
  // États pour les jeux
  const [allGames, setAllGames] = useState([]);
  const [popularGames, setPopularGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState(new Set()); // Pour suivre les jeux dans la wishlist
  
  // États pour l'affichage
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100 });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const wishlist = await gameService.getWishlist();
      const wishlistIdsSet = new Set();
      wishlist.forEach(item => {
        const gameId = item.game || item.game_id || item.id;
        wishlistIdsSet.add(parseInt(gameId));
      });
      setWishlistIds(wishlistIdsSet);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    }
  };

  const handleAddToWishlist = async (gameId, gameTitle) => {
    if (!user) {
      toast.error('Please login to add to wishlist');
      navigate('/login');
      return;
    }
    
    try {
      await gameService.addToWishlist(gameId);
      setWishlistIds(prev => new Set([...prev, parseInt(gameId)]));
      toast.success(`${gameTitle} added to wishlist!`);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add to wishlist';
      toast.error(errorMessage);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const games = await gameService.getAllGames();
      const gamesArray = Array.isArray(games) ? games : games.results || [];
      setAllGames(gamesArray);
      
      // Jeux populaires
      const popular = [...gamesArray]
        .sort((a, b) => (b.total_downloads || 0) - (a.total_downloads || 0))
        .slice(0, 8);
      setPopularGames(popular);
      
      // Jeux récents
      const recent = [...gamesArray]
        .sort((a, b) => new Date(b.release_date) - new Date(a.release_date))
        .slice(0, 6);
      setRecentGames(recent);
      
      // Extraire les catégories uniques
      const uniqueCategories = [];
      gamesArray.forEach(game => {
        if (game.categories && Array.isArray(game.categories)) {
          game.categories.forEach(cat => {
            if (!uniqueCategories.find(c => c.id === cat.id)) {
              uniqueCategories.push({ id: cat.id, name: cat.name, slug: cat.slug });
            }
          });
        }
      });
      setCategories(uniqueCategories);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSortedGames = () => {
    let filtered = [...allGames];
    
    // Filtre par recherche
    if (searchTerm.trim()) {
      filtered = filtered.filter(game => 
        game.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.short_description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtre par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(game => {
        if (!game.categories || !Array.isArray(game.categories) || game.categories.length === 0) {
          return false;
        }
        const selectedId = parseInt(selectedCategory);
        return game.categories.some(cat => parseInt(cat.id) === selectedId);
      });
    }
    
    // Filtre par prix
    filtered = filtered.filter(game => {
      const price = game.discount_price || game.price || 0;
      return price >= priceRange.min && price <= priceRange.max;
    });
    
    // Tri
    switch(sortBy) {
      case 'popular':
        filtered.sort((a, b) => (b.total_downloads || 0) - (a.total_downloads || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
        break;
      case 'price_asc':
        filtered.sort((a, b) => (a.discount_price || a.price || 0) - (b.discount_price || b.price || 0));
        break;
      case 'price_desc':
        filtered.sort((a, b) => (b.discount_price || b.price || 0) - (a.discount_price || a.price || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
        break;
      default:
        break;
    }
    
    return filtered;
  };

  const renderStars = (rating) => {
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

  // Rendu mode grille avec bouton wishlist fonctionnel
  const renderGridCard = (game) => {
    const finalPrice = game.discount_price || game.price;
    const originalPrice = game.discount_price ? game.price : null;
    const discountPercent = originalPrice ? Math.round((1 - finalPrice / originalPrice) * 100) : 0;
    const isInWishlist = wishlistIds.has(parseInt(game.id));
    
    return (
      <div key={game.id} className="game-card-grid" onClick={() => navigate(`/game/${game.id}`)}>
        <div className="game-card-image-wrapper">
          <img 
            src={game.cover_image || 'https://via.placeholder.com/300x200?text=No+Image'} 
            alt={game.title}
            className="game-card-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
            }}
          />
          {discountPercent > 0 && (
            <span className="discount-badge">-{discountPercent}%</span>
          )}
        </div>
        
        <div className="game-card-info">
          <h3 className="game-card-title">{game.title}</h3>
          <div className="game-card-rating">
            {renderStars(game.average_rating)}
            <span className="rating-count">({game.total_ratings || 0})</span>
          </div>
          <p className="game-card-description">
            {game.short_description || game.description?.substring(0, 80) || 'No description available'}
          </p>
          <div className="game-card-price">
            {originalPrice && <span className="original-price">${originalPrice}</span>}
            <span className="current-price">${finalPrice}</span>
          </div>
          <div className="game-card-actions">
            <button 
              className="btn-add-to-cart"
              onClick={(e) => {
                e.stopPropagation();
                addToCart(game);
              }}
            >
              <FaShoppingCart /> Add to Cart
            </button>
            <button 
              className={`btn-wishlist ${isInWishlist ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isInWishlist) {
                  handleAddToWishlist(game.id, game.title);
                } else {
                  toast.info(`${game.title} is already in your wishlist`);
                }
              }}
              disabled={isInWishlist}
              title={isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
            >
              <FaHeart /> {isInWishlist ? 'In Wishlist' : 'Wishlist'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Rendu mode liste avec bouton wishlist fonctionnel
  const renderListItem = (game) => {
    const finalPrice = game.discount_price || game.price;
    const originalPrice = game.discount_price ? game.price : null;
    const isInWishlist = wishlistIds.has(parseInt(game.id));
    
    return (
      <div key={game.id} className="game-list-item" onClick={() => navigate(`/game/${game.id}`)}>
        <div className="game-list-image">
          <img 
            src={game.cover_image || 'https://via.placeholder.com/100x100?text=No+Image'} 
            alt={game.title}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
            }}
          />
          {originalPrice && (
            <span className="list-discount">-{Math.round((1 - finalPrice / originalPrice) * 100)}%</span>
          )}
        </div>
        <div className="game-list-info">
          <h4>{game.title}</h4>
          <div className="game-list-rating">
            {renderStars(game.average_rating)}
            <span>({game.total_ratings || 0})</span>
          </div>
          <p>{game.short_description || game.description?.substring(0, 120) || 'No description available'}</p>
          <div className="game-list-meta">
            {game.categories && game.categories.slice(0, 2).map(cat => (
              <span key={cat.id} className="category-tag">{cat.name}</span>
            ))}
          </div>
        </div>
        <div className="game-list-price">
          <div className="price-container">
            {originalPrice && <span className="original-price">${originalPrice}</span>}
            <span className="current-price">${finalPrice}</span>
          </div>
          <div className="list-actions">
            <button 
              className="btn-add"
              onClick={(e) => {
                e.stopPropagation();
                addToCart(game);
              }}
            >
              <FaShoppingCart /> Add to Cart
            </button>
            <button 
              className={`btn-wishlist-list ${isInWishlist ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isInWishlist) {
                  handleAddToWishlist(game.id, game.title);
                } else {
                  toast.info(`${game.title} is already in your wishlist`);
                }
              }}
              disabled={isInWishlist}
              title={isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
            >
              <FaHeart /> {isInWishlist ? 'In Wishlist' : 'Wishlist'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  const filteredGames = getFilteredAndSortedGames();

  return (
    <div className="dashboard-container">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1>Welcome back, {user?.username || 'Gamer'}! 🎮</h1>
          <p>Discover amazing games, connect with players, and build your ultimate gaming library</p>
        </div>
      </div>

      {/* Popular Games Section */}
      {popularGames.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>🔥 Popular Games</h2>
            <button className="view-all" onClick={() => navigate('/games')}>View All →</button>
          </div>
          <div className="games-grid">
            {popularGames.map(game => renderGridCard(game))}
          </div>
        </div>
      )}

      {/* Recent Releases Section */}
      {recentGames.length > 0 && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>🆕 Recent Releases</h2>
            <button className="view-all" onClick={() => navigate('/games')}>View All →</button>
          </div>
          <div className="games-grid">
            {recentGames.map(game => renderGridCard(game))}
          </div>
        </div>
      )}

      {/* All Games Section with Filters */}
      <div className="dashboard-section all-games">
        <div className="section-header">
          <h2>🎯 All Games</h2>
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <FaTh />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <FaList />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="filters-bar">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search games..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-controls">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="popular">Most Popular</option>
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
            
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
              <FaFilter /> Filter
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="advanced-filters">
            <div className="price-filter">
              <label>Price Range ($)</label>
              <div className="price-inputs">
                <input 
                  type="number" 
                  placeholder="Min" 
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({...priceRange, min: Number(e.target.value) || 0})}
                />
                <span>to</span>
                <input 
                  type="number" 
                  placeholder="Max" 
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({...priceRange, max: Number(e.target.value) || 100})}
                />
              </div>
            </div>
            <button className="reset-filters" onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSortBy('popular');
              setPriceRange({ min: 0, max: 100 });
            }}>
              Reset Filters
            </button>
          </div>
        )}

        {/* Games Count */}
        <div className="games-count">
          Found <strong>{filteredGames.length}</strong> {filteredGames.length === 1 ? 'game' : 'games'}
        </div>
        
        {/* Games Display */}
        {filteredGames.length === 0 ? (
          <div className="no-results">
            <h3>No games found</h3>
            <p>Try adjusting your filters or search terms</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="games-grid">
            {filteredGames.map(game => renderGridCard(game))}
          </div>
        ) : (
          <div className="games-list">
            {filteredGames.map(game => renderListItem(game))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;