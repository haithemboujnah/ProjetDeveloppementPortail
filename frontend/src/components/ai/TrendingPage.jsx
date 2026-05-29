import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import GameCard from '../games/GameCard';
import { formatNumber, formatRating, formatCurrency } from '../../utils/formatters';
import { FaChartLine, FaFire, FaRocket, FaStar, FaUsers, FaDownload } from 'react-icons/fa';
import './TrendingPage.css';

const TrendingPage = () => {
  const navigate = useNavigate();
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month'); // week, month, year, all
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchTrendingGames();
  }, [timeframe]);

  const fetchTrendingGames = async () => {
    try {
      setLoading(true);
      const response = await api.get('/ai/trending/');
      setTrending(response.data.trending_games || []);
    } catch (error) {
      console.error('Failed to fetch trending games:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer par catégorie
  const filteredGames = trending.filter(item => {
    if (selectedCategory === 'all') return true;
    const categories = item.game.categories || [];
    return categories.some(cat => cat.name === selectedCategory || cat.slug === selectedCategory);
  });

  // Obtenir les top 3 pour le podium
  const topThree = filteredGames.slice(0, 3);
  const otherGames = filteredGames.slice(3);

  // Catégories disponibles
  const categories = ['all', 'Action', 'RPG', 'Strategy', 'Indie', 'Adventure'];

  const getRankColor = (index) => {
    switch(index) {
      case 0: return 'gold';
      case 1: return 'silver';
      case 2: return 'bronze';
      default: return '';
    }
  };

  const getTrendIcon = (trendScore) => {
    if (trendScore > 100) return <FaRocket className="trend-icon rocket" />;
    if (trendScore > 50) return <FaFire className="trend-icon fire" />;
    return <FaChartLine className="trend-icon" />;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="trending-page">
      <div className="trending-header">
        <div className="header-content">
          <h1>
            <FaChartLine /> Trending Games
          </h1>
          <p>Discover what's hot in the gaming community right now</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="timeframe-filters">
          <button 
            className={timeframe === 'week' ? 'active' : ''} 
            onClick={() => setTimeframe('week')}
          >
            This Week
          </button>
          <button 
            className={timeframe === 'month' ? 'active' : ''} 
            onClick={() => setTimeframe('month')}
          >
            This Month
          </button>
          <button 
            className={timeframe === 'year' ? 'active' : ''} 
            onClick={() => setTimeframe('year')}
          >
            This Year
          </button>
          <button 
            className={timeframe === 'all' ? 'active' : ''} 
            onClick={() => setTimeframe('all')}
          >
            All Time
          </button>
        </div>

        <div className="category-filters">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Podium Section */}
      {topThree.length > 0 && (
        <div className="podium-section">
          <h2>🏆 Top 3 Trending Games</h2>
          <div className="podium">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="podium-item second">
                <div className="podium-rank">2</div>
                <div className="podium-content">
                  <img 
                    src={topThree[1].game.cover_image || 'https://via.placeholder.com/150'} 
                    alt={topThree[1].game.title}
                    onClick={() => navigate(`/game/${topThree[1].game.id}`)}
                  />
                  <h3>{topThree[1].game.title}</h3>
                  <div className="podium-stats">
                    <span><FaUsers /> {topThree[1].new_owners} new</span>
                    <span><FaStar /> {topThree[1].game.average_rating}</span>
                  </div>
                </div>
                <div className="podium-stand" style={{height: '150px'}}>🥈</div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="podium-item first">
                <div className="podium-rank">1</div>
                <div className="podium-content">
                  <img 
                    src={topThree[0].game.cover_image || 'https://via.placeholder.com/150'} 
                    alt={topThree[0].game.title}
                    onClick={() => navigate(`/game/${topThree[0].game.id}`)}
                  />
                  <h3>{topThree[0].game.title}</h3>
                  <div className="podium-stats">
                    <span><FaUsers /> {topThree[0].new_owners} new</span>
                    <span><FaStar /> {topThree[0].game.average_rating}</span>
                  </div>
                </div>
                <div className="podium-stand" style={{height: '200px'}}>👑</div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="podium-item third">
                <div className="podium-rank">3</div>
                <div className="podium-content">
                  <img 
                    src={topThree[2].game.cover_image || 'https://via.placeholder.com/150'} 
                    alt={topThree[2].game.title}
                    onClick={() => navigate(`/game/${topThree[2].game.id}`)}
                  />
                  <h3>{topThree[2].game.title}</h3>
                  <div className="podium-stats">
                    <span><FaUsers /> {topThree[2].new_owners} new</span>
                    <span><FaStar /> {topThree[2].game.average_rating}</span>
                  </div>
                </div>
                <div className="podium-stand" style={{height: '100px'}}>🥉</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trending Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <FaFire />
          <div>
            <h3>{formatNumber(trending.reduce((sum, item) => sum + (item.new_owners || 0), 0))}</h3>
            <p>New Players This Month</p>
          </div>
        </div>
        <div className="stat-card">
          <FaDownload />
          <div>
            <h3>{formatNumber(trending.reduce((sum, item) => sum + (item.game.total_downloads || 0), 0))}</h3>
            <p>Total Downloads</p>
          </div>
        </div>
        <div className="stat-card">
          <FaStar />
          <div>
            <h3>
              {trending.length > 0 
                ? formatRating(trending.reduce((sum, item) => sum + (item.game.average_rating || 0), 0) / trending.length)
                : '0.0'
              } ★
            </h3>
            <p>Average Rating</p>
          </div>
        </div>
      </div>

      {/* Trending Games List */}
      <div className="trending-games-section">
        <div className="section-header">
          <h2><FaChartLine /> All Trending Games</h2>
          <p>Games gaining popularity right now</p>
        </div>

        {filteredGames.length === 0 ? (
          <div className="no-games">
            <p>No trending games found for this category.</p>
          </div>
        ) : (
          <div className="trending-games-grid">
            {otherGames.map((item, index) => (
              <div key={item.game.id} className="trending-game-card">
                <div className="trending-rank">#{index + 4}</div>
                <GameCard game={item.game} />
                <div className="trending-metrics">
                  <div className="metric">
                    <FaUsers />
                    <span>{item.new_owners} new players</span>
                  </div>
                  <div className="metric">
                    <FaChartLine />
                    <span>Score: {Math.round(item.trend_score)}</span>
                  </div>
                  {getTrendIcon(item.trend_score)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending by Category */}
      <div className="categories-trending">
        <h2>Trending by Category</h2>
        <div className="categories-grid">
          {categories.filter(c => c !== 'all').map(category => {
            const categoryGames = trending.filter(item => 
              item.game.categories?.some(cat => cat.name === category)
            ).slice(0, 3);
            
            if (categoryGames.length === 0) return null;
            
            return (
              <div key={category} className="category-card">
                <h3>{category}</h3>
                <div className="category-games">
                  {categoryGames.map(item => (
                    <div key={item.game.id} className="category-game" onClick={() => navigate(`/game/${item.game.id}`)}>
                      <img src={item.game.cover_image || 'https://via.placeholder.com/40'} alt={item.game.title} />
                      <div>
                        <p>{item.game.title}</p>
                        <small>🔥 {item.new_owners} new</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrendingPage;