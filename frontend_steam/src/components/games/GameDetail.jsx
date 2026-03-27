import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gameService } from '../../services/game';
import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ReviewList from '../reviews/ReviewList';
import ReviewForm from '../reviews/ReviewForm';
import { FaStar, FaStarHalfAlt, FaRegStar, FaShoppingCart, FaHeart } from 'react-icons/fa';
import './GameDetail.css';

const GameDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [refreshReviews, setRefreshReviews] = useState(0); // État pour déclencher le rafraîchissement
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const fetchGame = useCallback(async () => {
    try {
      const data = await gameService.getGameById(id);
      setGame(data);
    } catch (error) {
      console.error('Failed to fetch game:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const handleAddToWishlist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      console.log('Adding to wishlist - Game ID:', id);
      console.log('Game ID type:', typeof id);
      console.log('Game ID value:', id);
      
      const response = await gameService.addToWishlist(id);
      console.log('Wishlist response:', response);
      setInWishlist(true);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
    }
  };
  
  const handleReviewAdded = () => {
    // Incrémenter le compteur pour déclencher le rafraîchissement
    setRefreshReviews(prev => prev + 1);
    // Rafraîchir aussi les données du jeu pour mettre à jour la note moyenne
    fetchGame();
  };

  const renderRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} />);
    }
    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" />);
    }
    while (stars.length < 5) {
      stars.push(<FaRegStar key={stars.length} />);
    }
    return stars;
  };

  const getGameImage = () => {
    if (!game?.cover_image) return 'https://via.placeholder.com/600x400?text=No+Image';
    if (game.cover_image.startsWith('http')) return game.cover_image;
    return `http://localhost:8000${game.cover_image}`;
  };

  const getScreenshots = () => {
    if (!game?.screenshots) return [];
    return game.screenshots.map(img => {
      if (img.startsWith('http')) return img;
      return `http://localhost:8000${img}`;
    });
  };

  if (loading) return <LoadingSpinner />;
  if (!game) return <div className="container">Game not found</div>;

  return (
    <div className="game-detail-container">
      <div className="game-detail-header">
        <img 
          src={getGameImage()} 
          alt={game.title} 
          className="game-detail-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/600x400?text=Image+Not+Found';
          }}
        />
        <div className="game-detail-info">
          <h1>{game.title}</h1>
          <div className="game-detail-rating">
            {renderRating(game.average_rating)}
            <span>({game.total_ratings} reviews)</span>
          </div>
          <p className="game-detail-description-short">
            {game.short_description || game.description?.substring(0, 200)}
          </p>
          <p className="game-detail-price">
            ${game.discount_price || game.price}
          </p>
          <div className="game-detail-actions">
            <button 
              onClick={() => addToCart(game)}
              className="btn btn-primary"
            >
              <FaShoppingCart /> Add to Cart
            </button>
            <button 
              onClick={handleAddToWishlist}
              className="btn btn-secondary"
              disabled={inWishlist}
            >
              <FaHeart /> {inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="game-detail-description">
        <h2>About the Game</h2>
        <p>{game.description}</p>
      </div>
      
      {getScreenshots().length > 0 && (
        <div className="game-detail-screenshots">
          <h2>Screenshots</h2>
          <div className="screenshots-grid">
            {getScreenshots().map((screenshot, index) => (
              <img 
                key={index}
                src={screenshot}
                alt={`Screenshot ${index + 1}`}
                className="screenshot"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      <div className="game-detail-specs">
        <h2>System Requirements</h2>
        <div className="specs-grid">
          <div className="specs-min">
            <h3>Minimum</h3>
            <ul>
              <li>OS: {game.system_requirements_min?.os || 'Not specified'}</li>
              <li>Processor: {game.system_requirements_min?.processor || 'Not specified'}</li>
              <li>Memory: {game.system_requirements_min?.memory || 'Not specified'}</li>
              <li>Graphics: {game.system_requirements_min?.graphics || 'Not specified'}</li>
              <li>Storage: {game.system_requirements_min?.storage || 'Not specified'}</li>
            </ul>
          </div>
          <div className="specs-rec">
            <h3>Recommended</h3>
            <ul>
              <li>OS: {game.system_requirements_rec?.os || 'Not specified'}</li>
              <li>Processor: {game.system_requirements_rec?.processor || 'Not specified'}</li>
              <li>Memory: {game.system_requirements_rec?.memory || 'Not specified'}</li>
              <li>Graphics: {game.system_requirements_rec?.graphics || 'Not specified'}</li>
              <li>Storage: {game.system_requirements_rec?.storage || 'Not specified'}</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="game-detail-reviews">
        <h2>Reviews</h2>
        {user && <ReviewForm gameId={game.id} onReviewAdded={handleReviewAdded} />}
        <ReviewList gameId={game.id} refreshTrigger={refreshReviews} />
      </div>
    </div>
  );
};

export default GameDetail;