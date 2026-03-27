import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { 
  FaArrowLeft, FaDownload, FaDollarSign, FaStar, 
  FaUsers, FaCalendarAlt, FaGamepad, FaThumbsUp, FaReply,
  FaTrash
} from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import './GameStats.css';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const GameStats = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyComment, setReplyComment] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    fetchGameStats();
    fetchReviews();
  }, [id]);

  const fetchGameStats = async () => {
    try {
      setLoading(true);
      
      // Récupérer les détails du jeu
      const gameRes = await api.get(`/games/${id}/`);
      setGame(gameRes.data);
      
      // Récupérer les statistiques
      try {
        const statsRes = await api.get(`/games/${id}/stats/`);
        setStats(statsRes.data);
      } catch (statsError) {
        console.error('Failed to fetch stats:', statsError);
        setStats(null);
      }
      
    } catch (error) {
      console.error('Failed to fetch game:', error);
      if (error.response?.status === 404) {
        toast.error('Game not found');
        navigate('/developer');
      } else {
        toast.error('Failed to load game data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/reviews/?game_id=${id}`);
      const reviewsData = Array.isArray(response.data) 
        ? response.data 
        : response.data.results || [];
      setReviews(reviewsData);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleHelpful = async (reviewId) => {
    try {
      await api.post(`/reviews/${reviewId}/helpful/`);
      fetchReviews();
      toast.success('Marked as helpful!');
    } catch (error) {
      console.error('Failed to mark helpful:', error);
      toast.error('Failed to mark as helpful');
    }
  };

  const handleReply = async (reviewId) => {
    if (!replyComment.trim()) {
      toast.error('Please write a reply');
      return;
    }
    
    if (replyComment.trim().length < 5) {
      toast.error('Reply must be at least 5 characters');
      return;
    }
    
    setSubmittingReply(true);
    
    try {
      await api.post(`/reviews/${reviewId}/reply/`, {
        comment: replyComment.trim()
      });
      
      toast.success('Reply sent successfully!');
      setReplyingTo(null);
      setReplyComment('');
      fetchReviews(); // Rafraîchir les reviews
    } catch (error) {
      console.error('Failed to reply:', error);
      toast.error(error.response?.data?.error || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num || 0);
  };

  const renderRatingStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  // Données pour le graphique
  const salesData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Sales',
        data: [65, 59, 80, 81, 56, 55, 40, 45, 60, 75, 85, 95],
        borderColor: '#00fff9',
        backgroundColor: 'rgba(0, 255, 249, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#00fff9',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#fff',
          font: { size: 12 }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#00fff9',
        bodyColor: '#fff',
        borderColor: '#00fff9',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.1)', drawBorder: true },
        ticks: { color: '#fff' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)', drawBorder: true },
        ticks: { 
          color: '#fff',
          callback: function(value) { return '$' + value; }
        }
      }
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!game) return <div className="game-not-found">Game not found</div>;

  return (
    <div className="game-stats-container">
      <button className="back-button" onClick={() => navigate('/developer')}>
        <FaArrowLeft /> Back to Dashboard
      </button>
      
      <div className="stats-header">
        {game.cover_image && (
          <img 
            src={game.cover_image} 
            alt={game.title} 
            className="game-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/200x200?text=No+Image';
            }}
          />
        )}
        <div className="game-info">
          <h1>{game.title}</h1>
          <p className="game-description">
            {game.short_description || game.description?.substring(0, 200)}
          </p>
          <div className="game-meta">
            <span><FaCalendarAlt /> Released: {formatDate(game.release_date)}</span>
            <span><FaGamepad /> Status: {game.status}</span>
            <span className={`status-badge ${game.is_published ? 'published' : 'draft'}`}>
              {game.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <FaDownload className="stat-icon" />
          <div>
            <h3>{formatNumber(stats?.total_downloads || game.total_downloads || 0)}</h3>
            <p>Total Downloads</p>
          </div>
        </div>
        <div className="stat-card">
          <FaUsers className="stat-icon" />
          <div>
            <h3>{formatNumber(stats?.total_owners || 0)}</h3>
            <p>Total Owners</p>
          </div>
        </div>
        <div className="stat-card">
          <FaDollarSign className="stat-icon" />
          <div>
            <h3>{formatCurrency(stats?.revenue || 0)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="stat-card">
          <FaStar className="stat-icon" />
          <div>
            <h3>{stats?.average_rating || game.average_rating || 0} ★</h3>
            <p>Average Rating ({stats?.total_reviews || game.total_ratings || 0} reviews)</p>
          </div>
        </div>
      </div>
      
      <div className="chart-container">
        <h2>Sales Overview</h2>
        <Line data={salesData} options={chartOptions} />
      </div>
      
      {/* Reviews Section with Reply Functionality */}
      <div className="reviews-section">
        <h2>Game Reviews</h2>
        {reviews.length === 0 ? (
          <div className="no-reviews">
            <p>No reviews yet for this game.</p>
          </div>
        ) : (
          <div className="reviews-list">
            {reviews.map(review => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="review-user">
                    <div className="review-avatar">
                      {review.user_avatar ? (
                        <img src={review.user_avatar} alt={review.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {review.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <strong>{review.username}</strong>
                      <div className="review-rating">
                        {renderRatingStars(review.rating)}
                      </div>
                    </div>
                  </div>
                  <div className="review-date">
                    {formatDate(review.created_at)}
                  </div>
                </div>
                
                <div className="review-content">
                  <p>{review.comment}</p>
                </div>
                
                {/* Afficher les réponses existantes */}
                {review.replies && review.replies.length > 0 && (
                  <div className="review-replies">
                    {review.replies.map(reply => (
                      <div key={reply.id} className="reply-item">
                        <div className="reply-header">
                          <strong>🎮 Developer Response</strong>
                          <small>{formatDate(reply.created_at)}</small>
                        </div>
                        <p>{reply.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="review-footer">
                  <button 
                    onClick={() => handleHelpful(review.id)}
                    className="helpful-button"
                  >
                    <FaThumbsUp /> Helpful ({review.helpful_count || 0})
                  </button>
                  
                  {replyingTo !== review.id && (
                    <button 
                      onClick={() => setReplyingTo(review.id)}
                      className="reply-button"
                    >
                      <FaReply /> Reply as Developer
                    </button>
                  )}
                </div>
                
                {/* Formulaire de réponse */}
                {replyingTo === review.id && (
                  <div className="reply-form">
                    <textarea
                      value={replyComment}
                      onChange={(e) => setReplyComment(e.target.value)}
                      placeholder="Write your response to this review..."
                      rows="3"
                    />
                    <div className="reply-actions">
                      <button 
                        onClick={() => handleReply(review.id)}
                        className="btn-primary"
                        disabled={submittingReply}
                      >
                        {submittingReply ? 'Sending...' : 'Send Reply'}
                      </button>
                      <button 
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyComment('');
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameStats;