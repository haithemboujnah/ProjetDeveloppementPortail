import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import { FaBell, FaCheck, FaTimes } from 'react-icons/fa';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const { user } = useContext(AuthContext);

  const fetchNotifications = useCallback(async () => {
    // Ne pas essayer de récupérer les notifications si l'utilisateur n'est pas connecté
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.get('/notifications/');
      // S'assurer que les données sont un tableau
      const notificationsData = Array.isArray(response.data) 
        ? response.data 
        : response.data.results || [];
      setNotifications(notificationsData);
    } catch (error) {
      // Ignorer les erreurs quand l'utilisateur n'est pas connecté
      if (error.response?.status !== 401) {
        console.error('Failed to fetch notifications:', error);
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Ne récupérer les notifications que si l'utilisateur est connecté
    if (user) {
      fetchNotifications();
      // Rafraîchir les notifications toutes les 30 secondes
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
      setNotifications([]);
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId) => {
    if (!user) return;
    
    try {
      await api.post(`/notifications/${notificationId}/mark-read/`);
      setNotifications(prevNotifications => 
        prevNotifications.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await api.post('/notifications/mark-all-read/');
      setNotifications(prevNotifications =>
        prevNotifications.map(notif => ({ ...notif, is_read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Vérifier que notifications est un tableau avant d'appeler filter
  const unreadCount = Array.isArray(notifications) 
    ? notifications.filter(n => !n.is_read).length 
    : 0;

  const getIconByType = (type) => {
    switch(type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  // Ne pas afficher la cloche si l'utilisateur n'est pas connecté
  if (!user) {
    return null;
  }

  return (
    <div className="notifications-container">
      <button 
        className="notification-bell"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <FaBell />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {showDropdown && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                Mark all as read
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="notifications-loading">Loading...</div>
          ) : !Array.isArray(notifications) || notifications.length === 0 ? (
            <div className="no-notifications">No notifications</div>
          ) : (
            <div className="notifications-list">
              {notifications.map(notif => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="notification-icon">
                    {getIconByType(notif.notification_type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {!notif.is_read && <div className="notification-unread-dot" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;