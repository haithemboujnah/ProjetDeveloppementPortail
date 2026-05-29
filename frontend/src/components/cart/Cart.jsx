import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../contexts/CartContext';
import { FaTrash } from 'react-icons/fa';
import './Cart.css';

const Cart = () => {
  const { cartItems, removeFromCart, getCartTotal, clearCart } = useContext(CartContext);
  const navigate = useNavigate();

  // Fonction pour obtenir l'URL de l'image
  const getImageUrl = (item) => {
    if (item.cover_image && item.cover_image !== '') {
      if (item.cover_image.startsWith('http://') || item.cover_image.startsWith('https://')) {
        return item.cover_image;
      }
      return item.cover_image;
    }
    return 'https://cdn-icons-png.freepik.com/512/10809/10809585.png';
  };

  if (cartItems.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Your cart is empty</h2>
        <p>Browse our store and add some games!</p>
        <button 
          onClick={() => navigate('/')}
          className="btn btn-primary"
        >
          Browse Games
        </button>
      </div>
    );
  }

  return (
    <div className="container cart-container">
      <h2>Shopping Cart</h2>
      
      <div className="cart-items">
        {cartItems.map(item => (
          <div key={item.id} className="cart-item">
            <img 
              src={getImageUrl(item)} 
              alt={item.title}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://cdn-icons-png.freepik.com/512/10809/10809585.png';
              }}
            />
            <div className="cart-item-details">
              <h3>{item.title}</h3>
              <p>${item.discount_price || item.price}</p>
            </div>
            <button 
              onClick={() => removeFromCart(item.id)}
              className="btn btn-danger"
            >
              <FaTrash />
            </button>
          </div>
        ))}
      </div>
      
      <div className="cart-summary">
        <h3>Total: ${getCartTotal().toFixed(2)}</h3>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button onClick={clearCart} className="btn btn-secondary">
            Clear Cart
          </button>
          <button 
            onClick={() => navigate('/checkout')}
            className="btn btn-primary"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;