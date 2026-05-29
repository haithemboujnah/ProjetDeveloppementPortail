import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import GameCard from '../games/GameCard';
import { FaRobot, FaHeart, FaChartLine, FaSlidersH, FaSave, FaDollarSign, FaBrain } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './Recommendations.css';

// Fonction améliorée pour le calcul du prix prédit
const calculatePredictedPrice = (game) => {
  const currentPrice = game.discount_price || game.price;
  const rating = game.average_rating || 0;
  const downloads = game.total_downloads || 0;
  
  // Prix de base selon la note (entre $4.99 et $49.99)
  let basePrice = 4.99 + (rating / 5) * 45;
  
  // Bonus de popularité (max +$10)
  let popularityBonus = Math.min(downloads / 5000, 1) * 10;
  
  let suggested = basePrice + popularityBonus;
  
  // Limiter les variations extrêmes par rapport au prix actuel (±30%)
  const maxIncrease = currentPrice * 1.3;
  const maxDecrease = currentPrice * 0.7;
  
  if (suggested > maxIncrease) {
    suggested = maxIncrease;
  }
  if (suggested < maxDecrease) {
    suggested = maxDecrease;
  }
  
  // Arrondir à $0.99 pour un prix plus "naturel"
  suggested = Math.round(suggested);
  if (suggested > 0) {
    suggested = suggested - 0.01;
  }
  
  return suggested.toFixed(2);
};

const RecommendationsPage = () => {
  const { user } = useContext(AuthContext);
  const [recommendations, setRecommendations] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [useAdvancedAI, setUseAdvancedAI] = useState(true);
  const [preferences, setPreferences] = useState({
    favorite_genres: [],
    price_range_min: 0,
    price_range_max: 100,
    play_style: 'casual'
  });

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      fetchTrending();
    }
  }, [user, useAdvancedAI]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Utiliser l'endpoint avancé ou basique selon le toggle
      const recEndpoint = useAdvancedAI ? '/ai/advanced-recommendations/' : '/ai/recommendations/';
      
      const [recRes, trendRes, prefRes] = await Promise.all([
        api.get(recEndpoint),
        api.get('/ai/trending/'),
        api.get('/ai/preferences/')
      ]);
      
      setRecommendations(recRes.data.recommendations || []);
      setTrending(trendRes.data.trending_games || []);
      setPreferences(prefRes.data);
      
      if (useAdvancedAI && recRes.data.ml_ready === false) {
        toast('Using basic recommendations (ML training in progress)', { icon: '🤖' });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      setLoading(true);
      const trendRes = await api.get('/ai/trending/');
      setTrending(trendRes.data.trending_games || []);
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async () => {
    setSavingPreferences(true);
    try {
      const response = await api.post('/ai/preferences/', preferences);
      toast.success('Preferences updated!');
      setShowPreferences(false);
      fetchData();
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return '#00ff88';  
    if (score >= 0.6) return '#00fff9'; 
    if (score >= 0.4) return '#ffaa00';  
    return '#ff3366';                    
  };

  const getScoreEmoji = (score) => {
    if (score >= 0.8) return '🚀';
    if (score >= 0.6) return '👍';
    if (score >= 0.4) return '📊';
    return '💡';
  };

  const getScoreLabel = (score) => {
    if (score >= 0.8) return 'Excellent Match';
    if (score >= 0.6) return 'Good Match';
    if (score >= 0.4) return 'Average Match';
    return 'Low Match';
  };

  const availableGenres = ['Action', 'RPG', 'Strategy', 'Indie', 'Puzzle', 'Adventure', 'Simulation'];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="recommendations-page">
      <div className="page-header">
        <h1><FaBrain /> AI-Powered Recommendations</h1>
        <p>Personalized game suggestions based on your taste and behavior</p>
        <div className="ai-toggle">
          <button 
            className={`ai-toggle-btn ${useAdvancedAI ? 'active' : ''}`}
            onClick={() => setUseAdvancedAI(true)}
          >
            <FaRobot /> Advanced AI
          </button>
          <button 
            className={`ai-toggle-btn ${!useAdvancedAI ? 'active' : ''}`}
            onClick={() => setUseAdvancedAI(false)}
          >
            Basic AI
          </button>
        </div>
      </div>

      {/* User Info & Preferences */}
      {user && (
        <div className="user-preferences-bar">
          <div className="preferences-summary">
            <FaHeart /> Your taste: 
            {preferences.favorite_genres && preferences.favorite_genres.length > 0 ? (
              <span>{preferences.favorite_genres.join(', ')}</span>
            ) : (
              <span>Not set yet</span>
            )}
            <button className="btn-icon" onClick={() => setShowPreferences(!showPreferences)}>
              <FaSlidersH /> Customize
            </button>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="preferences-modal" onClick={() => setShowPreferences(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Customize Your Recommendations</h3>
            <div className="form-group">
              <label>Favorite Genres</label>
              <div className="genre-tags">
                {availableGenres.map(genre => (
                  <button
                    key={genre}
                    className={`genre-tag ${preferences.favorite_genres?.includes(genre) ? 'active' : ''}`}
                    onClick={() => {
                      if (preferences.favorite_genres?.includes(genre)) {
                        setPreferences({
                          ...preferences,
                          favorite_genres: preferences.favorite_genres.filter(g => g !== genre)
                        });
                      } else {
                        setPreferences({
                          ...preferences,
                          favorite_genres: [...(preferences.favorite_genres || []), genre]
                        });
                      }
                    }}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>Price Range</label>
              <div className="price-range-slider">
                <div className="price-values">
                  <span>${preferences.price_range_min || 0}</span>
                  <span>to</span>
                  <span>${preferences.price_range_max || 100}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={preferences.price_range_max || 100}
                  onChange={(e) => setPreferences({...preferences, price_range_max: parseInt(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Play Style</label>
              <div className="play-style-buttons">
                {['casual', 'hardcore', 'competitive'].map(style => (
                  <button
                    key={style}
                    className={`style-btn ${preferences.play_style === style ? 'active' : ''}`}
                    onClick={() => setPreferences({...preferences, play_style: style})}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="modal-actions">
              <button onClick={updatePreferences} className="btn-primary" disabled={savingPreferences}>
                <FaSave /> {savingPreferences ? 'Saving...' : 'Save & Refresh'}
              </button>
              <button onClick={() => setShowPreferences(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {user && recommendations.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2>
              {useAdvancedAI ? <FaBrain /> : <FaRobot />} 
              {useAdvancedAI ? ' Advanced AI Picks' : ' Recommended for You'}
            </h2>
            <p>
              {useAdvancedAI 
                ? 'Machine learning powered suggestions based on your taste' 
                : 'Based on your gaming history and preferences'}
            </p>
          </div>
          <div className="games-grid">
            {recommendations.slice(0, 12).map(rec => (
              <div key={rec.game.id} className="recommendation-card">
                <GameCard game={rec.game} />
                
                {/* Score de matching visuel */}
                <div className="matching-score">
                  <div className="score-header">
                    <span className="score-label">{getScoreLabel(rec.score)}</span>
                    <span className="score-value" style={{color: getScoreColor(rec.score)}}>
                      {getScoreEmoji(rec.score)} {Math.round(rec.score * 100)}%
                    </span>
                  </div>
                  <div className="score-bar-container">
                    <div 
                      className="score-bar-fill" 
                      style={{ 
                        width: `${rec.score * 100}%`,
                        background: `linear-gradient(90deg, ${getScoreColor(rec.score)}, ${getScoreColor(rec.score)}aa)`
                      }}
                    />
                  </div>
                  <div className="score-breakdown">
                    {rec.details && (
                      <>
                        <span title="Content Similarity">📄 {Math.round(rec.details.content * 100)}%</span>
                        <span title="Behavior Match">👥 {Math.round(rec.details.behavior * 100)}%</span>
                        <span title="Popularity">⭐ {Math.round(rec.details.popularity * 100)}%</span>
                        <span title="Preference Match">🎯 {Math.round(rec.details.preference * 100)}%</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="recommendation-reason">
                  <FaRobot /> {rec.reason}
                </div>
                <div className="price-prediction-badge">
                  <FaDollarSign /> AI Suggests: ${calculatePredictedPrice(rec.game)}
                </div>
                {useAdvancedAI && rec.details && (
                  <div className="ai-confidence">
                    Confidence: {Math.round(rec.score * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Games */}
      <div className="section">
        <div className="section-header">
          <h2><FaChartLine /> Trending Now</h2>
          <p>Most popular games this month</p>
        </div>
        <div className="games-grid">
          {trending.slice(0, 12).map(item => (
            <div key={item.game.id} className="trending-card">
              <GameCard game={item.game} />
              <div className="trending-badge">
                🔥 {item.new_owners} new players this month
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="section analytics">
        <div className="section-header">
          <h2><FaChartLine /> AI Insights</h2>
          <p>What the community is saying</p>
        </div>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Top Rated Games</h4>
            <div className="insight-list">
              {trending.slice(0, 5).map(item => (
                <div key={item.game.id} className="insight-item">
                  <span>{item.game.title}</span>
                  <span className="rating">★ {item.game.average_rating?.toFixed(1) || '0.0'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="insight-card">
            <h4>Most Played</h4>
            <div className="insight-list">
              {trending.slice(0, 5).map(item => (
                <div key={item.game.id} className="insight-item">
                  <span>{item.game.title}</span>
                  <span className="downloads">{item.game.total_downloads} downloads</span>
                </div>
              ))}
            </div>
          </div>
          <div className="insight-card">
            <h4>Best Value</h4>
            <div className="insight-list">
              {trending.slice(0, 5).map(item => (
                <div key={item.game.id} className="insight-item">
                  <span>{item.game.title}</span>
                  <span className="price">${item.game.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage;