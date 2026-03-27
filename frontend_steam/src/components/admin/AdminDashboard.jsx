import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  FaUsers, FaGamepad, FaDollarSign, FaStar, FaDownload,
  FaEye, FaBan, FaCheck, FaClock, FaChartLine, FaExclamationTriangle
} from 'react-icons/fa';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: { total: 0, developers: 0, active: 0 },
    games: { total: 0, published: 0, pending: 0, featured: 0 },
    revenue: { total: 0, platform_fee: 0, developer_payout: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    reviews: { total: 0, approved: 0, pending: 0, reported: 0 },
    categories: { labels: [], data: [] },
    downloads: 0,
    top_games: []
  });

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchAdminStats();
  }, [user, navigate]);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/stats/');
      console.log('API Response:', response.data); // Debug log
      
      // S'assurer que toutes les données sont présentes
      const data = response.data;
      setStats({
        users: data.users || { total: 0, developers: 0, active: 0 },
        games: data.games || { total: 0, published: 0, pending: 0, featured: 0 },
        revenue: data.revenue || { total: 0, platform_fee: 0, developer_payout: 0, monthly: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        reviews: data.reviews || { total: 0, approved: 0, pending: 0, reported: 0 },
        categories: data.categories || { labels: [], data: [] },
        downloads: data.downloads || 0,
        top_games: data.top_games || []
      });
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Données pour le graphique avec vérification
  const salesData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'Revenue ($)',
      data: stats.revenue?.monthly || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      borderColor: '#00fff9',
      backgroundColor: 'rgba(0, 255, 249, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const categoryData = {
    labels: stats.categories?.labels || [],
    datasets: [{
      data: stats.categories?.data || [],
      backgroundColor: ['#00fff9', '#ff00e5', '#9d00ff', '#fff000', '#ff0055'],
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { 
        labels: { color: '#fff' } 
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `$${context.raw.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: { 
        ticks: { color: '#fff' }, 
        grid: { color: 'rgba(255,255,255,0.1)' } 
      },
      y: { 
        ticks: { 
          color: '#fff',
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }, 
        grid: { color: 'rgba(255,255,255,0.1)' } 
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, {user?.username}! Manage the platform from here.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/admin/users')}>
          <FaUsers className="stat-icon users" />
          <div>
            <h3>{stats.users?.total || 0}</h3>
            <p>Total Users</p>
            <small>{stats.users?.developers || 0} Developers</small>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/admin/games')}>
          <FaGamepad className="stat-icon games" />
          <div>
            <h3>{stats.games?.total || 0}</h3>
            <p>Total Games</p>
            <small>{stats.games?.pending || 0} Pending</small>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/admin/orders')}>
          <FaDollarSign className="stat-icon revenue" />
          <div>
            <h3>${(stats.revenue?.total || 0).toLocaleString()}</h3>
            <p>Total Revenue</p>
            <small>Platform Fee: ${(stats.revenue?.platform_fee || 0).toLocaleString()}</small>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/admin/reviews')}>
          <FaExclamationTriangle className="stat-icon reports" />
          <div>
            <h3>{stats.reviews?.reported || 0}</h3>
            <p>Reported Reviews</p>
            <small>Pending moderation</small>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Revenue Overview</h3>
          <Line data={salesData} options={chartOptions} />
        </div>
        <div className="chart-card">
          <h3>Games by Category</h3>
          {stats.categories?.labels && stats.categories.labels.length > 0 ? (
            <Doughnut data={categoryData} options={chartOptions} />
          ) : (
            <p className="no-data">No category data available</p>
          )}
        </div>
      </div>

      {/* Top Games */}
      {stats.top_games && stats.top_games.length > 0 && (
        <div className="top-games">
          <h3>Top Selling Games</h3>
          <div className="top-games-list">
            {stats.top_games.map((game, index) => (
              <div key={game.id} className="top-game-item">
                <div className="rank">#{index + 1}</div>
                <div className="game-info">
                  <strong>{game.title}</strong>
                  <span>{game.sales} sales</span>
                </div>
                <div className="game-revenue">${(game.revenue || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button onClick={() => navigate('/admin/games/pending')} className="action-btn">
            <FaClock /> Review Pending Games
          </button>
          <button onClick={() => navigate('/admin/users')} className="action-btn">
            <FaUsers /> Manage Users
          </button>
          <button onClick={() => navigate('/admin/reviews/reported')} className="action-btn">
            <FaExclamationTriangle /> Moderate Reviews
          </button>
          <button onClick={() => navigate('/admin/analytics')} className="action-btn">
            <FaChartLine /> View Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;