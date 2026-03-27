import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../../services/game';
import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaHeart, FaShoppingCart, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './Wishlist.css';

const Wishlist = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = React.useContext(CartContext);
  const { user } = React.useContext(AuthContext);
  const navigate = useNavigate();

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      setLoading(true);
      const data = await gameService.getWishlist();
      
      // Vérifier que data est un tableau
      let gamesArray = [];
      if (Array.isArray(data)) {
        gamesArray = data;
      } else if (data && data.results) {
        gamesArray = data.results;
      } else if (data && data.wishlist) {
        gamesArray = data.wishlist;
      }
      
      setGames(gamesArray);
      console.log('Wishlist games:', gamesArray);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Fonction pour obtenir l'URL de l'image (identique à GameCard)
  const getImageUrl = (game) => {
    // Essayer différents formats de données
    const coverImage = game.game_cover || game.cover_image || game.game?.cover_image;
    
    if (coverImage && coverImage !== '') {
      if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
        return coverImage;
      }
      return coverImage;
    }
    return 'https://cdn-icons-png.freepik.com/512/10809/10809585.png';
  };

  const handleRemoveFromWishlist = async (gameId) => {
    try {
      await gameService.removeFromWishlist(gameId);
      setGames(games.filter(game => (game.game || game.id) !== gameId));
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove from wishlist');
    }
  };

  const handleAddToCart = (game) => {
    const gameToAdd = {
      id: game.game || game.id,
      title: game.game_title || game.title || game.game?.title,
      price: game.game_price || game.price || game.game?.price,
      cover_image: getImageUrl(game)
    };
    addToCart(gameToAdd);
    toast.success('Added to cart');
  };

  if (loading) return <LoadingSpinner />;

  if (games.length === 0) {
    return (
      <div className="container wishlist-container">
        <div className="empty-wishlist">
          <FaHeart size={64} color="#888" />
          <h2>Your wishlist is empty</h2>
          <p>Save your favorite games here to buy them later!</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Browse Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container wishlist-container">
      <h2>My Wishlist</h2>
      <p className="wishlist-count">{games.length} game(s) in your wishlist</p>
      
      <div className="wishlist-grid">
        {games.map(game => {
          const gameId = game.game || game.id;
          const gameTitle = game.game_title || game.title || game.game?.title;
          const gamePrice = game.game_price || game.price || game.game?.price;
          
          return (
            <div key={gameId} className="wishlist-item">
              <img 
                src={getImageUrl(game)} 
                alt={gameTitle}
                onClick={() => navigate(`/game/${gameId}`)}
                style={{ cursor: 'pointer' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://cdn-icons-png.freepik.com/512/10809/10809585.png';
                }}
              />
              <div className="wishlist-item-info">
                <h3 onClick={() => navigate(`/game/${gameId}`)} style={{ cursor: 'pointer' }}>
                  {gameTitle}
                </h3>
                <p className="price">${gamePrice}</p>
                <div className="wishlist-actions">
                  <button 
                    onClick={() => handleAddToCart(game)}
                    className="btn btn-primary"
                  >
                    <FaShoppingCart /> Add to Cart
                  </button>
                  <button 
                    onClick={() => handleRemoveFromWishlist(gameId)}
                    className="btn btn-danger"
                  >
                    <FaTrash /> Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Wishlist;