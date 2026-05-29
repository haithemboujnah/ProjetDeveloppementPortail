import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaEye, FaDownload } from 'react-icons/fa';
import './OrderHistory.css';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/orders/');
      
      // S'assurer que les données sont un tableau
      let ordersData = [];
      if (Array.isArray(response.data)) {
        ordersData = response.data;
      } else if (response.data && response.data.results) {
        ordersData = response.data.results;
      } else if (response.data && typeof response.data === 'object') {
        // Si c'est un objet, essayer de le convertir en tableau
        ordersData = Object.values(response.data);
      }
      
      setOrders(ordersData);
      console.log('Orders loaded:', ordersData); // Debug
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setError('Failed to load orders. Please try again later.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'danger';
      case 'refunded': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return '✅';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      case 'refunded': return '↩️';
      default: return '📦';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      case 'refunded': return 'Refunded';
      default: return status;
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="container orders-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchOrders} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container orders-container">
        <div className="empty-orders">
          <h2>No orders yet</h2>
          <p>Your purchase history will appear here</p>
          <button onClick={() => window.location.href = '/'} className="btn btn-primary">
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container orders-container">
      <h2>Order History</h2>
      <p className="orders-count">{orders.length} order(s)</p>
      
      <div className="orders-list">
        {orders.map(order => (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <div>
                <span className="order-number">#{order.order_number}</span>
                <span className={`order-status status-${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)} {getStatusText(order.status)}
                </span>
              </div>
              <div className="order-date">
                {new Date(order.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <div className="order-items">
              {order.items && order.items.length > 0 ? (
                order.items.map(item => (
                  <div key={item.id} className="order-item">
                    <img 
                      src={item.game_details?.cover_image || 'https://via.placeholder.com/50x50'} 
                      alt={item.game_details?.title || 'Game'} 
                    />
                    <div className="order-item-info">
                      <h4>{item.game_details?.title || 'Game'}</h4>
                      <p>${parseFloat(item.price_paid).toFixed(2)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-items">No items found</div>
              )}
            </div>
            
            <div className="order-footer">
              <div className="order-total">
                Total: <strong>${parseFloat(order.total_amount).toFixed(2)}</strong>
              </div>
              <button 
                onClick={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                className="btn btn-secondary"
              >
                <FaEye /> {selectedOrder === order.id ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            
            {selectedOrder === order.id && (
              <div className="order-details">
                <h4>Order Details</h4>
                <p><strong>Order Number:</strong> {order.order_number}</p>
                <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
                <p><strong>Payment Method:</strong> Stripe</p>
                <p><strong>Status:</strong> {getStatusText(order.status)}</p>
                {order.completed_at && (
                  <p><strong>Completed:</strong> {new Date(order.completed_at).toLocaleString()}</p>
                )}
                <button 
                  onClick={() => window.open(`/orders/${order.id}/invoice`, '_blank')}
                  className="btn btn-primary"
                >
                  <FaDownload /> Download Invoice
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;