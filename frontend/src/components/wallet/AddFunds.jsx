import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './AddFunds.css';

const AddFunds = ({ onSuccess }) => {
  const { user, setUser } = useContext(AuthContext);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (amountNum < 10) {
      toast.error('Minimum amount is $10.00');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post('/users/wallet/add/', { amount: amountNum });
      
      // Mettre à jour l'utilisateur
      const updatedUser = { ...user, wallet_balance: response.data.new_balance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      toast.success(`$${amountNum.toFixed(2)} added to your wallet!`);
      setAmount('');
      
      // Appeler le callback onSuccess si fourni
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to add funds:', error);
      toast.error(error.response?.data?.error || 'Failed to add funds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-funds-card">
      <div className="add-funds-header">
        <h3>Add Funds to Wallet</h3>
        {onSuccess && (
          <button className="close-button" onClick={onSuccess}>
            ✕
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit}>
        <div className="amount-input">
          <span className="currency">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="10"
            min="10"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Add Funds'}
        </button>
      </form>
      <p className="min-amount">Minimum: $10.00</p>
    </div>
  );
};

export default AddFunds;