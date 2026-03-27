import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaCheck, FaTimes, FaTrash, FaStar } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './AdminReviews.css';

const AdminReviewsReported = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportedReviews();
  }, []);

  const fetchReportedReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reviews/');
      let reviewsData = Array.isArray(response.data) ? response.data : response.data.results || [];
      const reportedReviews = reviewsData.filter(review => !review.is_approved);
      setReviews(reportedReviews);
    } catch (error) {
      console.error('Failed to fetch reported reviews:', error);
      toast.error('Failed to load reported reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await api.patch(`/reviews/${reviewId}/`, { is_approved: true });
      toast.success('Review approved');
      fetchReportedReviews();
    } catch (error) {
      console.error('Failed to approve review:', error);
      toast.error('Failed to approve review');
    }
  };

  const handleRejectReview = async (reviewId) => {
    try {
      await api.patch(`/reviews/${reviewId}/`, { is_approved: false });
      toast.success('Review rejected');
      fetchReportedReviews();
    } catch (error) {
      console.error('Failed to reject review:', error);
      toast.error('Failed to reject review');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    try {
      await api.delete(`/reviews/${reviewId}/`);
      toast.success('Review deleted');
      fetchReportedReviews();
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Failed to delete review');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-reviews">
      <div className="page-header">
        <h1>Reported Reviews</h1>
        <p>Moderate reviews that have been reported by users</p>
      </div>

      {reviews.length === 0 ? (
        <div className="no-data">
          <p>No reported reviews to moderate</p>
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map(review => (
            <div key={review.id} className="review-card pending">
              <div className="review-header">
                <div className="review-user">
                  <div className="user-avatar">
                    {review.user_avatar ? (
                      <img src={review.user_avatar} alt={review.username} />
                    ) : (
                      <div className="avatar-placeholder">{review.username?.[0]?.toUpperCase()}</div>
                    )}
                  </div>
                  <div>
                    <strong>{review.username}</strong>
                    <div className="game-title">{review.game_title || `Game ID: ${review.game}`}</div>
                  </div>
                </div>
                <div className="review-rating">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} color={i < review.rating ? '#ffc107' : '#e4e5e9'} />
                  ))}
                </div>
              </div>
              <div className="review-content">
                <p>{review.comment}</p>
              </div>
              <div className="review-footer">
                <div className="review-meta">
                  <small>Posted: {new Date(review.created_at).toLocaleDateString()}</small>
                  <small>Helpful: {review.helpful_count}</small>
                </div>
                <div className="review-actions">
                  <button onClick={() => handleApproveReview(review.id)} className="btn-approve">
                    <FaCheck /> Approve
                  </button>
                  <button onClick={() => handleRejectReview(review.id)} className="btn-reject">
                    <FaTimes /> Reject
                  </button>
                  <button onClick={() => handleDeleteReview(review.id)} className="btn-delete">
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviewsReported;