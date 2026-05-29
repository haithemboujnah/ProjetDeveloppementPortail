import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Checkout.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Fonction pour formater le montant
const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return '0.00';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0.00';
  return numAmount.toFixed(2);
};

// Composant de formulaire de paiement
const PaymentForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useContext(CartContext);
  const { user, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  // Mettre à jour le solde du portefeuille quand l'utilisateur change
  useEffect(() => {
    if (user?.wallet_balance !== undefined) {
      const balance = typeof user.wallet_balance === 'string' 
        ? parseFloat(user.wallet_balance) 
        : user.wallet_balance;
      setWalletBalance(isNaN(balance) ? 0 : balance);
    }
  }, [user]);

  const total = getCartTotal();
  const hasEnoughBalance = walletBalance >= total;

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      toast.error('Payment system not ready');
      return;
    }
    
    // Vérifier le solde
    if (!hasEnoughBalance) {
      setError(`Insufficient balance. You need $${formatAmount(total)} but have $${formatAmount(walletBalance)}`);
      toast.error('Insufficient balance');
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
        const confirmResponse = await api.post('/orders/confirm-order/', {
          payment_intent_id: data.payment_intent_id
        });
        
        // Mettre à jour le solde de l'utilisateur
        if (confirmResponse.data.new_balance !== undefined) {
          const updatedUser = { 
            ...user, 
            wallet_balance: confirmResponse.data.new_balance 
          };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        toast.success('Payment successful! Games added to your library.');
        clearCart();
        navigate('/library');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      const errorMessage = error.response?.data?.error || 'Payment failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
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
          <strong>${formatAmount(total)}</strong>
        </div>
      </div>
      
      <div className="payment-details">
        <h3>Payment Details</h3>
        
        {/* Wallet Balance Display */}
        <div className="wallet-info">
          <div className="wallet-balance">
            <strong>Wallet Balance:</strong> 
            <span className={hasEnoughBalance ? 'sufficient' : 'insufficient'}>
              ${formatAmount(walletBalance)}
            </span>
          </div>
          {!hasEnoughBalance && (
            <div className="insufficient-warning">
              ⚠️ Insufficient balance. You need ${formatAmount(total)} but have ${formatAmount(walletBalance)}.
              <br />
              <button 
                onClick={() => navigate('/profile')} 
                className="btn-add-funds-link"
              >
                Add funds to your wallet
              </button>
            </div>
          )}
        </div>
        
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
          disabled={!stripe || loading || !hasEnoughBalance}
        >
          {loading ? 'Processing...' : `Pay $${formatAmount(total)}`}
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