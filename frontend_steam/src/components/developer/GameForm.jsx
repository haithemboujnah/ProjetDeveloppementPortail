import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaSave, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './GameForm.css';

const GameForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    short_description: '',
    price: '',
    discount_price: '',
    cover_image: '',
    screenshots: [],
    trailer_url: '',
    game_file: null,
    executable_name: '',
    file_size: '',
    status: 'draft',
    is_published: false,
    system_requirements_min: {
      os: '',
      processor: '',
      memory: '',
      graphics: '',
      storage: ''
    },
    system_requirements_rec: {
      os: '',
      processor: '',
      memory: '',
      graphics: '',
      storage: ''
    },
    categories: []
  });
  
  const [newScreenshot, setNewScreenshot] = useState('');

  // Vérifier si l'utilisateur est développeur
  useEffect(() => {
    if (user && user.role !== 'developer') {
      toast.error('Only developers can create games');
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchGame();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      setFetchingCategories(true);
      const response = await api.get('/games/categories/');
      
      let categoriesData = [];
      if (Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (response.data && response.data.results) {
        categoriesData = response.data.results;
      }
      
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    } finally {
      setFetchingCategories(false);
    }
  };

  const fetchGame = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/games/${id}/`);
      const game = response.data;
      
      setFormData({
        ...formData,
        title: game.title || '',
        slug: game.slug || '',
        description: game.description || '',
        short_description: game.short_description || '',
        price: game.price || '',
        discount_price: game.discount_price || '',
        cover_image: game.cover_image || '',
        screenshots: game.screenshots || [],
        trailer_url: game.trailer_url || '',
        executable_name: game.executable_name || '',
        file_size: game.file_size || '',
        status: game.status || 'draft',
        is_published: game.is_published || false,
        system_requirements_min: game.system_requirements_min || {
          os: '', processor: '', memory: '', graphics: '', storage: ''
        },
        system_requirements_rec: game.system_requirements_rec || {
          os: '', processor: '', memory: '', graphics: '', storage: ''
        },
        categories: game.categories?.map(c => c.id) || []
      });
    } catch (error) {
      console.error('Failed to fetch game:', error);
      toast.error('Failed to load game data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRequirementsChange = (type, field, value) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleCategoryChange = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  };

  const addScreenshot = () => {
    if (newScreenshot && newScreenshot.trim()) {
      setFormData(prev => ({
        ...prev,
        screenshots: [...prev.screenshots, newScreenshot.trim()]
      }));
      setNewScreenshot('');
    }
  };

  const removeScreenshot = (index) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Créer un objet avec les données du jeu (sans les fichiers)
      const gameData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        status: formData.status,
        is_published: formData.is_published
      };
      
      // Ajouter les champs optionnels s'ils ont des valeurs
      if (formData.short_description) gameData.short_description = formData.short_description;
      if (formData.cover_image) gameData.cover_image = formData.cover_image;
      if (formData.screenshots && formData.screenshots.length) gameData.screenshots = formData.screenshots;
      if (formData.trailer_url) gameData.trailer_url = formData.trailer_url;
      if (formData.executable_name) gameData.executable_name = formData.executable_name;
      if (formData.file_size) gameData.file_size = parseInt(formData.file_size);
      if (formData.discount_price) gameData.discount_price = parseFloat(formData.discount_price);
      if (formData.slug) gameData.slug = formData.slug;
      
      // Ajouter les catégories
      if (formData.categories && formData.categories.length) {
        gameData.categories = formData.categories;
      }
      
      // Ajouter les requirements s'ils ont des valeurs
      const hasMinReqs = Object.values(formData.system_requirements_min).some(v => v);
      if (hasMinReqs) {
        gameData.system_requirements_min = formData.system_requirements_min;
      }
      
      const hasRecReqs = Object.values(formData.system_requirements_rec).some(v => v);
      if (hasRecReqs) {
        gameData.system_requirements_rec = formData.system_requirements_rec;
      }
      
      console.log('Sending game data:', gameData);
      
      let response;
      if (id) {
        response = await api.patch(`/games/${id}/`, gameData);
      } else {
        response = await api.post('/games/', gameData);
      }
      
      console.log('Success response:', response.data);
      toast.success(id ? 'Game updated successfully!' : 'Game created successfully!');
      navigate('/developer');
      
    } catch (error) {
      console.error('Failed to save game:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === 'object') {
          Object.keys(errors).forEach(key => {
            if (Array.isArray(errors[key])) {
              toast.error(`${key}: ${errors[key][0]}`);
            } else if (typeof errors[key] === 'string') {
              toast.error(`${key}: ${errors[key]}`);
            }
          });
        }
      } else {
        toast.error('Failed to save game');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || fetchingCategories) return <LoadingSpinner />;

  return (
    <div className="game-form-container">
      <div className="form-header">
        <h1>{id ? 'Edit Game' : 'Create New Game'}</h1>
        <button className="btn-secondary" onClick={() => navigate('/developer')}>
          <FaTimes /> Cancel
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="game-form">
        {/* Basic Information */}
        <div className="form-section">
          <h2>Basic Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Game title"
              />
            </div>
            <div className="form-group">
              <label>Slug (URL)</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="game-url-slug"
              />
              <small>Leave empty for auto-generation</small>
            </div>
          </div>
          
          <div className="form-group">
            <label>Short Description</label>
            <input
              type="text"
              name="short_description"
              value={formData.short_description}
              onChange={handleChange}
              placeholder="Brief description (max 300 chars)"
              maxLength="300"
            />
          </div>
          
          <div className="form-group">
            <label>Full Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="6"
              placeholder="Detailed game description..."
              required
            />
          </div>
        </div>
        
        {/* Pricing */}
        <div className="form-section">
          <h2>Pricing</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Price ($)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Discount Price ($)</label>
              <input
                type="number"
                name="discount_price"
                value={formData.discount_price}
                onChange={handleChange}
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        
        {/* Media */}
        <div className="form-section">
          <h2>Media</h2>
          <div className="form-group">
            <label>Cover Image URL</label>
            <input
              type="url"
              name="cover_image"
              value={formData.cover_image}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>
          
          <div className="form-group">
            <label>Screenshots</label>
            <div className="screenshots-input">
              <input
                type="url"
                value={newScreenshot}
                onChange={(e) => setNewScreenshot(e.target.value)}
                placeholder="https://..."
              />
              <button type="button" onClick={addScreenshot} className="btn-icon">
                <FaPlus />
              </button>
            </div>
            <div className="screenshots-list">
              {formData.screenshots.map((url, index) => (
                <div key={index} className="screenshot-item">
                  <span>{url.substring(0, 50)}...</span>
                  <button type="button" onClick={() => removeScreenshot(index)}>
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>Trailer URL</label>
            <input
              type="url"
              name="trailer_url"
              value={formData.trailer_url}
              onChange={handleChange}
              placeholder="https://youtube.com/..."
            />
          </div>
        </div>
        
        {/* Game Files - Optionnel */}
        <div className="form-section">
          <h2>Game Files (Optional)</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Game File</label>
              <input
                type="file"
                name="game_file"
                onChange={(e) => setFormData({...formData, game_file: e.target.files[0]})}
                accept=".exe,.zip,.rar,.msi"
              />
              <small>You can upload the game file later</small>
            </div>
            <div className="form-group">
              <label>Executable Name</label>
              <input
                type="text"
                name="executable_name"
                value={formData.executable_name}
                onChange={handleChange}
                placeholder="game.exe"
              />
            </div>
          </div>
          <div className="form-group">
            <label>File Size (MB)</label>
            <input
              type="number"
              name="file_size"
              value={formData.file_size}
              onChange={handleChange}
              placeholder="0"
            />
          </div>
        </div>
        
        {/* System Requirements */}
        <div className="form-section">
          <h2>System Requirements</h2>
          <div className="requirements-grid">
            <div>
              <h3>Minimum</h3>
              <div className="form-group">
                <label>OS</label>
                <input
                  type="text"
                  value={formData.system_requirements_min.os}
                  onChange={(e) => handleRequirementsChange('system_requirements_min', 'os', e.target.value)}
                  placeholder="Windows 10"
                />
              </div>
              <div className="form-group">
                <label>Processor</label>
                <input
                  type="text"
                  value={formData.system_requirements_min.processor}
                  onChange={(e) => handleRequirementsChange('system_requirements_min', 'processor', e.target.value)}
                  placeholder="Intel Core i5"
                />
              </div>
              <div className="form-group">
                <label>Memory</label>
                <input
                  type="text"
                  value={formData.system_requirements_min.memory}
                  onChange={(e) => handleRequirementsChange('system_requirements_min', 'memory', e.target.value)}
                  placeholder="8 GB RAM"
                />
              </div>
              <div className="form-group">
                <label>Graphics</label>
                <input
                  type="text"
                  value={formData.system_requirements_min.graphics}
                  onChange={(e) => handleRequirementsChange('system_requirements_min', 'graphics', e.target.value)}
                  placeholder="NVIDIA GTX 960"
                />
              </div>
              <div className="form-group">
                <label>Storage</label>
                <input
                  type="text"
                  value={formData.system_requirements_min.storage}
                  onChange={(e) => handleRequirementsChange('system_requirements_min', 'storage', e.target.value)}
                  placeholder="50 GB"
                />
              </div>
            </div>
            <div>
              <h3>Recommended</h3>
              <div className="form-group">
                <label>OS</label>
                <input
                  type="text"
                  value={formData.system_requirements_rec.os}
                  onChange={(e) => handleRequirementsChange('system_requirements_rec', 'os', e.target.value)}
                  placeholder="Windows 11"
                />
              </div>
              <div className="form-group">
                <label>Processor</label>
                <input
                  type="text"
                  value={formData.system_requirements_rec.processor}
                  onChange={(e) => handleRequirementsChange('system_requirements_rec', 'processor', e.target.value)}
                  placeholder="Intel Core i7"
                />
              </div>
              <div className="form-group">
                <label>Memory</label>
                <input
                  type="text"
                  value={formData.system_requirements_rec.memory}
                  onChange={(e) => handleRequirementsChange('system_requirements_rec', 'memory', e.target.value)}
                  placeholder="16 GB RAM"
                />
              </div>
              <div className="form-group">
                <label>Graphics</label>
                <input
                  type="text"
                  value={formData.system_requirements_rec.graphics}
                  onChange={(e) => handleRequirementsChange('system_requirements_rec', 'graphics', e.target.value)}
                  placeholder="NVIDIA GTX 1060"
                />
              </div>
              <div className="form-group">
                <label>Storage</label>
                <input
                  type="text"
                  value={formData.system_requirements_rec.storage}
                  onChange={(e) => handleRequirementsChange('system_requirements_rec', 'storage', e.target.value)}
                  placeholder="50 GB"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Categories */}
        <div className="form-section">
          <h2>Categories</h2>
          {categories.length === 0 ? (
            <p className="no-categories">No categories available. Please contact admin to create categories.</p>
          ) : (
            <div className="categories-grid">
              {categories.map(cat => (
                <label key={cat.id} className="category-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(cat.id)}
                    onChange={() => handleCategoryChange(cat.id)}
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          )}
        </div>
        
        {/* Status */}
        <div className="form-section">
          <h2>Status</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="draft">Draft</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleChange}
                />
                Publish immediately
              </label>
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            <FaSave /> {submitting ? 'Saving...' : (id ? 'Update Game' : 'Create Game')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GameForm;