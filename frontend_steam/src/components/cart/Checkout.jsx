import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Checkout.css';

// Charger Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Composant de formulaire de paiement
const PaymentForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Créer un payment intent
      const gameIds = cartItems.map(item => item.id);
      const { data } = await api.post('/orders/create-payment-intent/', {
        game_ids: gameIds
      });
      
      // 2. Confirmer le paiement avec Stripe
      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.client_secret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: user.username,
              email: user.email,
            },
          },
        }
      );
      
      if (stripeError) {
        setError(stripeError.message);
        toast.error(stripeError.message);
        setLoading(false);
        return;
      }
      
      if (paymentIntent.status === 'succeeded') {
        // 3. Confirmer la commande
        await api.post('/orders/confirm-order/', {
          payment_intent_id: data.payment_intent_id
        });
        
        toast.success('Payment successful! Games added to your library.');
        clearCart();
        navigate('/library');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setError(error.response?.data?.error || 'Payment failed. Please try again.');
      toast.error('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const total = getCartTotal();
  
  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="order-summary">
        <h3>Order Summary</h3>
        {cartItems.map(item => (
          <div key={item.id} className="order-summary-item">
            <span>{item.title}</span>
            <span>${item.discount_price || item.price}</span>
          </div>
        ))}
        <div className="order-summary-total">
          <strong>Total</strong>
          <strong>${total.toFixed(2)}</strong>
        </div>
      </div>
      
      <div className="payment-details">
        <h3>Payment Details</h3>
        <div className="card-element-wrapper">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#fff',
                  '::placeholder': {
                    color: '#aaa',
                  },
                  backgroundColor: 'transparent',
                },
                invalid: {
                  color: '#dc3545',
                },
              },
              hidePostalCode: false,
            }}
          />
        </div>
        
        {error && <div className="payment-error">{error}</div>}
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={!stripe || loading}
        >
          {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
        </button>
        
        <p className="secure-payment">
          🔒 Secure payment powered by Stripe
        </p>
      </div>
    </form>
  );
};

// Composant principal Checkout
const Checkout = () => {
  const { cartItems } = useContext(CartContext);
  const navigate = useNavigate();
  
  if (cartItems.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Your cart is empty</h2>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          Browse Games
        </button>
      </div>
    );
  }
  
  return (
    <div className="container checkout-container">
      <h2>Checkout</h2>
      <Elements stripe={stripePromise}>
        <PaymentForm />
      </Elements>
    </div>
  );
};

export default Checkout;