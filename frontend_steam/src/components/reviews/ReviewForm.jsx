import React, { useState } from 'react';
import api from '../../services/api';
import { FaStar } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './Reviews.css';

const ReviewForm = ({ gameId, onReviewAdded }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== SUBMITTING REVIEW ===');
    console.log('Game ID:', gameId);
    console.log('Rating:', rating);
    console.log('Comment:', comment);
    
    // Validations
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    if (!comment.trim()) {
      toast.error('Please write a review');
      return;
    }
    
    if (comment.trim().length < 10) {
      toast.error('Review must be at least 10 characters long');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const reviewData = {
        game: parseInt(gameId),
        rating: rating,
        comment: comment.trim()
      };
      
      console.log('Sending data:', reviewData);
      
      const response = await api.post('/reviews/', reviewData);
      
      console.log('Response:', response.data);
      toast.success('Review submitted successfully!');
      
      // Reset form
      setRating(0);
      setComment('');
      
      // Appeler la fonction callback pour rafraîchir la liste
      if (onReviewAdded) {
        onReviewAdded(response.data);
      }
      
    } catch (error) {
      console.error('Failed to submit review:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else if (error.response?.data?.rating) {
        toast.error(error.response.data.rating);
      } else if (error.response?.data?.comment) {
        toast.error(error.response.data.comment);
      } else {
        toast.error('Failed to submit review. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-form">
      <h3>Write a Review</h3>
      <form onSubmit={handleSubmit}>
        <div className="rating-input">
          <label>Your Rating:</label>
          <div className="stars">
            {[...Array(5)].map((_, index) => {
              const ratingValue = index + 1;
              return (
                <FaStar
                  key={index}
                  className="star"
                  color={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
                  size={24}
                  onClick={() => setRating(ratingValue)}
                  onMouseEnter={() => setHover(ratingValue)}
                  onMouseLeave={() => setHover(0)}
                  style={{ cursor: 'pointer', marginRight: '5px' }}
                />
              );
            })}
          </div>
        </div>
        
        <div className="form-group">
          <label>Your Review:</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="4"
            placeholder="Share your thoughts about this game... (minimum 10 characters)"
            required
          />
          <small className={`char-count ${comment.trim().length >= 10 ? 'success' : comment.trim().length > 0 ? 'error' : ''}`}>
            {comment.trim().length}/10 characters minimum
          </small>
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;