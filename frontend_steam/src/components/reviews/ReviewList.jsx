import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import { FaStar, FaStarHalfAlt, FaRegStar, FaThumbsUp, FaReply } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './Reviews.css';

const ReviewList = ({ gameId, refreshTrigger }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyComment, setReplyComment] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const { user } = useContext(AuthContext);

  const fetchReviews = useCallback(async () => {
    if (!gameId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/reviews/?game_id=${gameId}`);
      
      const reviewsData = Array.isArray(response.data) 
        ? response.data 
        : response.data.results || [];
      
      // Debug: Afficher les données des reviews
      console.log('Reviews data:', reviewsData);
      reviewsData.forEach(review => {
        console.log(`Review ${review.id}: can_reply = ${review.can_reply}`);
        console.log(`  - User: ${review.username}`);
        console.log(`  - Game developer: ${review.game_developer || 'unknown'}`);
        console.log(`  - Current user: ${user?.username}`);
      });
      
      setReviews(reviewsData);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [gameId, user]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews, refreshTrigger]);

  const handleHelpful = async (reviewId) => {
    try {
      await api.post(`/reviews/${reviewId}/helpful/`);
      fetchReviews();
      toast.success('Thanks for your feedback!');
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
      fetchReviews(); // Rafraîchir pour afficher la réponse
    } catch (error) {
      console.error('Failed to reply:', error);
      toast.error(error.response?.data?.error || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const renderRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} color="#ffc107" size={14} />);
    }
    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" color="#ffc107" size={14} />);
    }
    while (stars.length < 5) {
      stars.push(<FaRegStar key={stars.length} color="#e4e5e9" size={14} />);
    }
    return stars;
  };

  if (loading) {
    return <div className="reviews-loading">Loading reviews...</div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="no-reviews">
        <p>No reviews yet. Be the first to review this game!</p>
      </div>
    );
  }

  return (
    <div className="reviews-list">
      {reviews.map(review => {
        const canReply = review.can_reply && user && user.id !== review.user;
        
        return (
          <div key={review.id} className="review-card">
            <div className="review-header">
              <div className="review-user">
                {review.user_avatar ? (
                  <img src={review.user_avatar} alt={review.username} className="review-avatar" />
                ) : (
                  <div className="review-avatar-placeholder">
                    {review.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <strong>{review.username || 'Anonymous'}</strong>
                  <div className="review-rating">
                    {renderRating(review.rating)}
                  </div>
                </div>
              </div>
              <div className="review-date">
                {new Date(review.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <div className="review-content">
              <p>{review.comment}</p>
            </div>
            
            {/* Afficher les réponses */}
            {review.replies && review.replies.length > 0 && (
              <div className="review-replies">
                {review.replies.map(reply => (
                  <div key={reply.id} className="reply-item">
                    <div className="reply-header">
                      <strong>🎮 Developer {reply.developer_name}</strong>
                      <small>{new Date(reply.created_at).toLocaleDateString()}</small>
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
              
              {canReply && replyingTo !== review.id && (
                <button 
                  onClick={() => setReplyingTo(review.id)}
                  className="reply-button"
                >
                  <FaReply /> Reply
                </button>
              )}
            </div>
            
            {/* Formulaire de réponse */}
            {replyingTo === review.id && (
              <div className="reply-form">
                <textarea
                  value={replyComment}
                  onChange={(e) => setReplyComment(e.target.value)}
                  placeholder="Write your reply as developer..."
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
        );
      })}
    </div>
  );
};

export default ReviewList;