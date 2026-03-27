import React, { useContext, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FaEdit, FaSave, FaTimes, FaUpload, FaUser, FaEnvelope, FaUserTag, FaGlobe, FaMapMarkerAlt, FaLink } from 'react-icons/fa';
import './Profile.css';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // État pour toutes les données modifiables
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    bio: user?.bio || '',
    role: user?.role || 'user',
    avatar: null,
    // Données du profil
    website: user?.profile?.website || '',
    location: user?.profile?.location || '',
    social_links: user?.profile?.social_links || {
      twitter: '',
      github: '',
      discord: ''
    }
  });
  
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, avatar: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSocialLinkChange = (platform, value) => {
    setFormData({
      ...formData,
      social_links: {
        ...formData.social_links,
        [platform]: value
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const data = new FormData();
    
    // Ajouter tous les champs modifiables
    if (formData.username !== user.username) data.append('username', formData.username);
    if (formData.email !== user.email) data.append('email', formData.email);
    if (formData.first_name !== user.first_name) data.append('first_name', formData.first_name);
    if (formData.last_name !== user.last_name) data.append('last_name', formData.last_name);
    if (formData.bio !== user.bio) data.append('bio', formData.bio);
    if (formData.role !== user.role) data.append('role', formData.role);
    if (formData.avatar) data.append('avatar', formData.avatar);
    
    // Ajouter les champs du profil
    if (formData.website !== user?.profile?.website) data.append('website', formData.website);
    if (formData.location !== user?.profile?.location) data.append('location', formData.location);
    if (JSON.stringify(formData.social_links) !== JSON.stringify(user?.profile?.social_links)) {
      data.append('social_links', JSON.stringify(formData.social_links));
    }
    
    try {
      const response = await api.patch('/users/profile/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUser(response.data);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {avatarPreview || user.avatar ? (
              <img 
                src={avatarPreview || user.avatar} 
                alt={user.username}
                className="avatar-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/100';
                }}
              />
            ) : (
              <div className="avatar-placeholder">
                {user.username[0].toUpperCase()}
              </div>
            )}
            {isEditing && (
              <label className="avatar-upload">
                <FaUpload />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
          
          <div className="profile-info">
            <h2>{user.first_name ? `${user.first_name} ${user.last_name}` : user.username}</h2>
            <p className="user-email">{user.email}</p>
            <p className="user-role">
              {user.role === 'developer' ? '🎮 Game Developer' : '🎯 Gamer'}
            </p>
          </div>
          
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="edit-button"
          >
            {isEditing ? <FaTimes /> : <FaEdit />}
          </button>
        </div>
        
        <div className="profile-stats">
          <div className="stat">
            <span className="stat-value">${user.wallet_balance || 0}</span>
            <span className="stat-label">Wallet Balance</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.owned_games_count || 0}</span>
            <span className="stat-label">Games Owned</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.reviews_count || 0}</span>
            <span className="stat-label">Reviews</span>
          </div>
        </div>
        
        {!isEditing ? (
          <>
            <div className="profile-bio">
              <h3>About me</h3>
              <p>{user.bio || 'No bio yet. Click edit to add one!'}</p>
            </div>
            
            {(user.profile?.website || user.profile?.location) && (
              <div className="profile-details">
                <h3>Details</h3>
                {user.profile?.website && (
                  <p><FaGlobe /> <a href={user.profile.website} target="_blank" rel="noopener noreferrer">{user.profile.website}</a></p>
                )}
                {user.profile?.location && (
                  <p><FaMapMarkerAlt /> {user.profile.location}</p>
                )}
              </div>
            )}
            
            {user.profile?.social_links && Object.keys(user.profile.social_links).some(key => user.profile.social_links[key]) && (
              <div className="profile-social">
                <h3>Social Links</h3>
                <div className="social-links">
                  {user.profile.social_links.twitter && (
                    <a href={user.profile.social_links.twitter} target="_blank" rel="noopener noreferrer">Twitter</a>
                  )}
                  {user.profile.social_links.github && (
                    <a href={user.profile.social_links.github} target="_blank" rel="noopener noreferrer">GitHub</a>
                  )}
                  {user.profile.social_links.discord && (
                    <span>Discord: {user.profile.social_links.discord}</span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label><FaUser /> Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              
              <div className="form-group">
                <label><FaEnvelope /> Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label><FaUserTag /> Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="user">Gamer</option>
                <option value="developer">Game Developer</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows="4"
                placeholder="Tell us about yourself..."
              />
            </div>
            
            <div className="form-group">
              <label><FaGlobe /> Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
              />
            </div>
            
            <div className="form-group">
              <label><FaMapMarkerAlt /> Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, Country"
              />
            </div>
            
            <div className="form-group">
              <label><FaLink /> Social Links</label>
              <input
                type="url"
                value={formData.social_links.twitter || ''}
                onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                placeholder="Twitter URL"
              />
              <input
                type="url"
                value={formData.social_links.github || ''}
                onChange={(e) => handleSocialLinkChange('github', e.target.value)}
                placeholder="GitHub URL"
                style={{ marginTop: '0.5rem' }}
              />
              <input
                type="text"
                value={formData.social_links.discord || ''}
                onChange={(e) => handleSocialLinkChange('discord', e.target.value)}
                placeholder="Discord Username"
                style={{ marginTop: '0.5rem' }}
              />
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setIsEditing(false);
                  // Reset form data
                  setFormData({
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    bio: user.bio || '',
                    role: user.role,
                    avatar: null,
                    website: user.profile?.website || '',
                    location: user.profile?.location || '',
                    social_links: user.profile?.social_links || { twitter: '', github: '', discord: '' }
                  });
                  setAvatarPreview(user.avatar);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;