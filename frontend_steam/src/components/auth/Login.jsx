import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const toastShown = useRef(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    toastShown.current = false;
    
    try {
      const userData = await login(credentials);
      console.log('Login successful, redirecting...');
      
      if (!toastShown.current) {
        toastShown.current = true;
        toast.success(`Welcome back, ${userData.username}!`, {
          id: 'login-success',
          duration: 2000
        });
      }
      
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = error.response?.data?.error || 'Invalid credentials';
      toast.error(errorMessage, { id: 'login-error' });
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to Steam Clone</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;