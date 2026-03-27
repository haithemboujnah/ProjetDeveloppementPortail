import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  FaGamepad, FaDollarSign, FaDownload, FaStar, 
  FaPlus, FaEdit, FaTrash, FaChartLine, FaUsers,
  FaEye, FaShoppingCart, FaCalendarAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import './DeveloperDashboard.css';

const DeveloperDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState({
    total_games: 0,
    total_revenue: 0,
    total_downloads: 0,
    average_rating: 0,
    total_owners: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    if (!user || user.role !== 'developer') {
      navigate('/');
      return;
    }
    fetchDeveloperData();
  }, [user, navigate]);

  const fetchDeveloperData = async () => {
    try {
      setLoading(true);
      
      // Récupérer les jeux du développeur
      const gamesResponse = await api.get('/games/developer/games/');
      const gamesData = Array.isArray(gamesResponse.data) ? gamesResponse.data : gamesResponse.data.results || [];
      setGames(gamesData);
      
      // Calculer les statistiques
      let totalRevenue = 0;
      let totalDownloads = 0;
      let totalRatings = 0;
      let totalRatingSum = 0;
      let totalOwners = 0;
      
      gamesData.forEach(game => {
        totalDownloads += game.total_downloads || 0;
        totalRatings += game.total_ratings || 0;
        totalRatingSum += (game.average_rating || 0) * (game.total_ratings || 0);
      });
      
      setStats({
        total_games: gamesData.length,
        total_revenue: totalRevenue,
        total_downloads: totalDownloads,
        average_rating: totalRatings > 0 ? (totalRatingSum / totalRatings).toFixed(1) : 0,
        total_owners: totalOwners
      });
      
    } catch (error) {
      console.error('Failed to fetch developer data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId, gameTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${gameTitle}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.delete(`/games/${gameId}/`);
      toast.success('Game deleted successfully');
      fetchDeveloperData();
    } catch (error) {
      console.error('Failed to delete game:', error);
      toast.error('Failed to delete game');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="developer-dashboard">
      <div className="dashboard-header">
        <h1>Developer Dashboard</h1>
        <p>Welcome back, {user?.username}! Manage your games and track your earnings.</p>
        <button className="btn-create-game" onClick={() => navigate('/developer/games/new')}>
          <FaPlus /> Create New Game
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FaGamepad /></div>
          <div className="stat-info">
            <h3>{stats.total_games}</h3>
            <p>Total Games</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaDollarSign /></div>
          <div className="stat-info">
            <h3>${stats.total_revenue.toLocaleString()}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaDownload /></div>
          <div className="stat-info">
            <h3>{stats.total_downloads.toLocaleString()}</h3>
            <p>Total Downloads</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaStar /></div>
          <div className="stat-info">
            <h3>{stats.average_rating} ★</h3>
            <p>Average Rating</p>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="period-selector">
        <button className={selectedPeriod === 'week' ? 'active' : ''} onClick={() => setSelectedPeriod('week')}>
          This Week
        </button>
        <button className={selectedPeriod === 'month' ? 'active' : ''} onClick={() => setSelectedPeriod('month')}>
          This Month
        </button>
        <button className={selectedPeriod === 'year' ? 'active' : ''} onClick={() => setSelectedPeriod('year')}>
          This Year
        </button>
        <button className={selectedPeriod === 'all' ? 'active' : ''} onClick={() => setSelectedPeriod('all')}>
          All Time
        </button>
      </div>

      {/* Games List */}
      <div className="games-section">
        <div className="section-header">
          <h2>Your Games</h2>
          <div className="games-count">{games.length} games</div>
        </div>
        
        {games.length === 0 ? (
          <div className="empty-games">
            <FaGamepad size={64} color="#888" />
            <h3>No games yet</h3>
            <p>Create your first game to start selling on Steam Clone!</p>
            <button className="btn-primary" onClick={() => navigate('/developer/games/new')}>
              Create Game
            </button>
          </div>
        ) : (
          <div className="games-table">
            <div className="table-header">
              <div>Game</div>
              <div>Sales</div>
              <div>Revenue</div>
              <div>Rating</div>
              <div>Downloads</div>
              <div>Actions</div>
            </div>
            {games.map(game => (
              <div key={game.id} className="table-row">
                <div className="game-info">
                  <img src={game.cover_image || 'https://via.placeholder.com/50'} alt={game.title} />
                  <div>
                    <h4>{game.title}</h4>
                    <p>${game.price}</p>
                  </div>
                </div>
                <div>{game.total_ratings || 0}</div>
                <div>${((game.total_downloads || 0) * (game.price || 0)).toLocaleString()}</div>
                <div className="rating">{game.average_rating || 0} ★</div>
                <div>{game.total_downloads || 0}</div>
                <div className="actions">
                  <button onClick={() => navigate(`/developer/games/${game.id}/edit`)} className="btn-edit" title="Edit">
                    <FaEdit />
                  </button>
                  <button onClick={() => navigate(`/developer/games/${game.id}/stats`)} className="btn-stats" title="Statistics">
                    <FaChartLine />
                  </button>
                  <button onClick={() => handleDeleteGame(game.id, game.title)} className="btn-delete" title="Delete">
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperDashboard;