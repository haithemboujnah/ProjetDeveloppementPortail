import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { CartContext } from '../../contexts/CartContext';
import { FiShoppingCart, FiUser, FiLogOut, FiHeart, FiBook, FiList, FiHome, FiMenu, FiX, FiSettings, FiCpu, FiTrendingUp, FiUserCheck } from 'react-icons/fi';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { cartCount } = useContext(CartContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: '/', icon: <FiHome />, label: 'Home' },
    { to: '/games', icon: null, label: 'All Games' },
  ];

  if (user) {
    navLinks.push(
      { to: '/library', icon: <FiBook />, label: 'Library' },
      { to: '/wishlist', icon: <FiHeart />, label: 'Wishlist' },
      { to: '/orders', icon: <FiList />, label: 'Orders' }
    );
  }

  const getAvatarUrl = () => {
    if (!user?.avatar || avatarError) return null;
    if (user.avatar === '' || user.avatar === 'null' || user.avatar === 'undefined') return null;
    
    let avatarUrl = user.avatar;
    
    if (avatarUrl.startsWith('/media/')) {
      let encoded = avatarUrl.replace('/media/', '');
      try {
        let decoded = decodeURIComponent(encoded);
        decoded = decoded.replace(/^https?:\/\/https?:\/\//, 'https://');
        if (!decoded.startsWith('http://') && !decoded.startsWith('https://')) {
          decoded = 'https://' + decoded;
        }
        avatarUrl = decoded;
      } catch (e) {
        console.error('Failed to decode avatar URL:', e);
        return null;
      }
    }
    
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      const proxyUrl = `http://localhost:8000/proxy-image/?url=${encodeURIComponent(avatarUrl)}`;
      return proxyUrl;
    }
    
    return null;
  };

  const handleAvatarError = () => {
    console.error('Failed to load avatar');
    setAvatarError(true);
  };

  const avatarUrl = getAvatarUrl();

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🎮</span>
          <span className="logo-text">Steam Clone</span>
        </Link>

        <button 
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>

        <div className={`navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {navLinks.map(link => (
            <Link 
              key={link.to}
              to={link.to} 
              className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.icon && <span className="nav-icon">{link.icon}</span>}
              <span>{link.label}</span>
            </Link>
          ))}

          {/* Menu IA avec dropdown */}
          <div className="dropdown">
            <button className="dropdown-btn">
              <FiCpu /> AI Features
            </button>
            <div className="dropdown-content">
              <Link to="/recommendations" onClick={() => setMobileMenuOpen(false)}>
                <FiUserCheck /> Personalized
              </Link>
              <Link to="/trending" onClick={() => setMobileMenuOpen(false)}>
                <FiTrendingUp /> Trending Now
              </Link>
            </div>
          </div>

          {user?.role === 'developer' && (
            <Link to="/developer" className="nav-link developer-link">
              Developer Dashboard
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link to="/admin" className="nav-link admin-link">
              <FiSettings /> Admin Dashboard
            </Link>
          )}

          <Link to="/cart" className={`nav-link cart-link ${isActive('/cart') ? 'active' : ''}`}>
            <FiShoppingCart />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          {user ? (
            <div className="user-menu">
              <Link to="/profile" className="user-avatar">
                {avatarUrl && !avatarError ? (
                  <img 
                    src={avatarUrl} 
                    alt={user.username}
                    onError={handleAvatarError}
                    className="avatar-image"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="username">{user.username}</span>
              </Link>
              <button onClick={logout} className="logout-btn" title="Logout">
                <FiLogOut />
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-login">Login</Link>
              <Link to="/register" className="btn-register">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;