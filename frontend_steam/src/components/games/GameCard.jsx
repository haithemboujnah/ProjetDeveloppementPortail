import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../contexts/CartContext';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import './GameCard.css';

const GameCard = ({ game }) => {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

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

  // L'URL de l'image est maintenant une URL directe
  const getImageUrl = () => {
    if (game.cover_image && game.cover_image !== '') {
      // Si l'URL commence par http, l'utiliser directement
      if (game.cover_image.startsWith('http')) {
        return game.cover_image;
      }
      return game.cover_image;
    }
    return 'https://cdn-icons-png.freepik.com/512/10809/10809585.png';
  };

  return (
    <div className="game-card" onClick={() => navigate(`/game/${game.id}`)}>
      <img
        src={getImageUrl()}
        alt={game.title}
        className="game-card-image"
        onError={(e) => {
          console.error('Failed to load image:', getImageUrl());
          e.target.onerror = null;
          e.target.src = 'https://cdn-icons-png.freepik.com/512/10809/10809585.png';
        }}
      />
      <div className="game-card-content">
        <h3 className="game-card-title">{game.title}</h3>
        <div className="game-card-rating">
          {renderRating(game.average_rating)}
          <span>({game.total_ratings || 0})</span>
        </div>
        <div className="game-card-price">
          ${game.discount_price || game.price || 0}
        </div>
        <button
          className="btn btn-primary"
          onClick={(e) => {
            e.stopPropagation();
            addToCart(game);
          }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default GameCard;