import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gameService } from '../../services/game';
import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import ReviewList from '../reviews/ReviewList';
import ReviewForm from '../reviews/ReviewForm';
import { 
  FaStar, FaStarHalfAlt, FaRegStar, FaShoppingCart, FaHeart, 
  FaRobot, FaChartLine, FaArrowRight, FaDollarSign 
} from 'react-icons/fa';
import api from '../../services/api';
import './GameDetail.css';

const GameDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [refreshReviews, setRefreshReviews] = useState(0);
  const [similarGames, setSimilarGames] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [pricePrediction, setPricePrediction] = useState(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  // Fonction pour obtenir la couleur, l'emoji et le label en fonction du score
  const getScoreMetadata = (score) => {
    if (score >= 0.7) {
      return { color: '#00ff88', emoji: '🚀', label: 'Excellent Match' };
    } else if (score >= 0.5) {
      return { color: '#00fff9', emoji: '👍', label: 'Good Match' };
    } else if (score >= 0.3) {
      return { color: '#ffaa00', emoji: '📊', label: 'Average Match' };
    } else {
      return { color: '#ff3366', emoji: '💡', label: 'Low Match' };
    }
  };

  const fetchGame = useCallback(async () => {
    try {
      const data = await gameService.getGameById(id);
      setGame(data);
      
      // Récupérer les jeux similaires via IA
      try {
        const similarRes = await api.get(`/ai/similar/${id}/`);
        setSimilarGames(similarRes.data.similar_games || []);
      } catch (error) {
        console.error('Failed to fetch similar games:', error);
      }
      
      // Récupérer l'analyse des sentiments
      try {
        const sentimentRes = await api.get(`/ai/sentiment/${id}/`);
        setSentiment(sentimentRes.data);
      } catch (error) {
        console.error('Failed to fetch sentiment:', error);
      }
      
      // Récupérer la prédiction de prix pour tous les utilisateurs connectés
      if (user) {
        try {
          const priceRes = await api.get(`/ai/price-prediction/${id}/`);
          setPricePrediction(priceRes.data);
        } catch (error) {
          console.error('Failed to fetch price prediction:', error);
        }
      }
      
    } catch (error) {
      console.error('Failed to fetch game:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

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
      const response = await gameService.addToWishlist(id);
      console.log('Wishlist response:', response);
      setInWishlist(true);
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
    }
  };
  
  const handleReviewAdded = () => {
    setRefreshReviews(prev => prev + 1);
    fetchGame();
  };

  const renderRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;

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
          
          {/* IA Sentiment Badge */}
          {sentiment && sentiment.total_reviews > 0 && (
            <div className="ai-sentiment-badge" onClick={() => setShowAIAnalysis(!showAIAnalysis)}>
              <FaRobot /> AI Sentiment Analysis
              {sentiment.sentiment_breakdown.positive > sentiment.sentiment_breakdown.negative ? ' 😊' : 
               sentiment.sentiment_breakdown.negative > sentiment.sentiment_breakdown.positive ? ' 😞' : ' 😐'}
              <FaArrowRight className="arrow-icon" />
            </div>
          )}
          
          {/* Price Prediction Card */}
          {user && pricePrediction && (
            <div className={`price-prediction-card ${pricePrediction.predicted_price > parseFloat(game.price) ? 'good-value' : 'consider-discount'}`}>
              <div className="price-prediction-header">
                <FaDollarSign /> AI Price Analysis
              </div>
              <div className="price-prediction-content">
                <div className="current-price-section">
                  <span className="label">Current Price</span>
                  <span className="value">${parseFloat(game.price).toFixed(2)}</span>
                </div>
                <div className="predicted-price-section">
                  <span className="label">AI Suggested Price</span>
                  <span className="value">${pricePrediction.predicted_price}</span>
                </div>
                <div className="recommendation-section">
                  <FaRobot />
                  <span>{pricePrediction.recommendation}</span>
                </div>
                {pricePrediction.predicted_price < parseFloat(game.price) && (
                  <div className="discount-hint">
                    ⚡ AI suggests waiting for a discount
                  </div>
                )}
                {pricePrediction.predicted_price > parseFloat(game.price) && (
                  <div className="good-deal-hint">
                    🎯 Great value according to AI
                  </div>
                )}
              </div>
            </div>
          )}
          
          <p className="game-detail-description-short">
            {game.short_description || game.description?.substring(0, 200)}
          </p>
          <p className="game-detail-price">
            ${game.discount_price || game.price}
            {pricePrediction && pricePrediction.predicted_price !== parseFloat(game.price) && (
              <span className="price-prediction-tag">
                <FaChartLine /> AI suggests: ${pricePrediction.predicted_price}
                <small>({pricePrediction.recommendation})</small>
              </span>
            )}
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
      
      {/* AI Analysis Panel */}
      {showAIAnalysis && sentiment && sentiment.total_reviews > 0 && (
        <div className="ai-analysis-panel">
          <h3><FaRobot /> AI Sentiment Analysis</h3>
          <div className="sentiment-stats">
            <div className="sentiment-bar">
              <div 
                className="sentiment-positive" 
                style={{width: `${(sentiment.sentiment_breakdown.positive / sentiment.total_reviews) * 100}%`}}
              >
                👍 Positive: {sentiment.sentiment_breakdown.positive}
              </div>
              <div 
                className="sentiment-neutral" 
                style={{width: `${(sentiment.sentiment_breakdown.neutral / sentiment.total_reviews) * 100}%`}}
              >
                😐 Neutral: {sentiment.sentiment_breakdown.neutral}
              </div>
              <div 
                className="sentiment-negative" 
                style={{width: `${(sentiment.sentiment_breakdown.negative / sentiment.total_reviews) * 100}%`}}
              >
                👎 Negative: {sentiment.sentiment_breakdown.negative}
              </div>
            </div>
            <div className="sentiment-score">
              Overall Sentiment Score: 
              <strong style={{color: sentiment.sentiment_score > 0 ? '#00ff88' : sentiment.sentiment_score < 0 ? '#ff3366' : '#ffaa00'}}>
                {sentiment.sentiment_score.toFixed(2)}
              </strong>
            </div>
            <div className="sentiment-summary">
              {sentiment.sentiment_breakdown.positive > sentiment.sentiment_breakdown.negative ? 
                "Players are loving this game! 🎉" : 
                sentiment.sentiment_breakdown.negative > sentiment.sentiment_breakdown.positive ?
                "Some players have concerns about this game. 🤔" :
                "Mixed opinions from players. 📊"}
            </div>
          </div>
        </div>
      )}
      
      <div className="game-detail-description">
        <h2>About the Game</h2>
        <p>{game.description}</p>
      </div>
      
      {/* Similar Games Section with Colors and Emojis */}
      {similarGames.length > 0 && (
        <div className="similar-games">
          <h2><FaRobot /> You Might Also Like</h2>
          <p>Recommended based on this game</p>
          <div className="similar-games-grid">
            {similarGames.slice(0, 4).map(similar => {
              const similarityScore = similar.similarity;
              const { color, emoji, label } = getScoreMetadata(similarityScore);
              const percentScore = Math.round(similarityScore * 100);
              
              return (
                <div key={similar.game.id} className="similar-game-card" onClick={() => navigate(`/game/${similar.game.id}`)}>
                  <img 
                    src={similar.game.cover_image || 'https://via.placeholder.com/200x150'} 
                    alt={similar.game.title}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/200x150?text=No+Image';
                    }}
                  />
                  <div className="similar-game-info">
                    <h4>{similar.game.title}</h4>
                    <p>${similar.game.price}</p>
                    
                    {/* Score de matching coloré avec barre */}
                    <div className="similarity-score-container">
                      <div className="similarity-header">
                        <span className="similarity-emoji">{emoji}</span>
                        <span className="similarity-label" style={{color: color}}>
                          {label}
                        </span>
                        <span className="similarity-percent" style={{color: color}}>
                          {percentScore}%
                        </span>
                      </div>
                      <div className="similarity-bar-bg">
                        <div 
                          className="similarity-bar-fill" 
                          style={{ 
                            width: `${percentScore}%`,
                            backgroundColor: color,
                            boxShadow: `0 0 10px ${color}`
                          }}
                        />
                      </div>
                      
                      {/* Catégories communes */}
                      {similar.common_categories && similar.common_categories.length > 0 && (
                        <div className="similarity-categories">
                          {similar.common_categories.map(cat => (
                            <span key={cat} className="cat-tag">🎮 {cat}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {similarGames.length > 4 && (
            <div className="view-more">
              <button onClick={() => navigate(`/similar/${game.id}`)} className="btn-secondary">
                View More Similar Games <FaArrowRight />
              </button>
            </div>
          )}
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