import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaDownload, FaPlay, FaCheck, FaTimes, FaInfoCircle, FaArrowLeft } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './GameDownload.css';

const GameDownload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    fetchGameDetails();
    checkInstallation();
  }, [id]);

  const fetchGameDetails = async () => {
    try {
      const response = await api.get(`/games/${id}/`);
      setGame(response.data);
    } catch (error) {
      console.error('Failed to fetch game details:', error);
      toast.error('Failed to load game details');
    } finally {
      setLoading(false);
    }
  };

  const checkInstallation = async () => {
    try {
      const response = await api.get(`/games/my-library/${id}/`);
      setInstalled(response.data.is_installed || false);
    } catch (error) {
      // Game not in library or not installed
      setInstalled(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Simuler le téléchargement avec progression
      const interval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);
      
      // Appel API pour le téléchargement
      const response = await api.get(`/games/my-library/${id}/download/`);
      
      setTimeout(async () => {
        clearInterval(interval);
        setDownloadProgress(100);
        
        // Marquer comme installé
        await api.patch(`/games/my-library/${id}/update/`, {
          is_installed: true,
          install_path: `C:/Games/${game.title.replace(/[^a-z0-9]/gi, '_')}`
        });
        
        setInstalled(true);
        toast.success(`${game.title} installed successfully!`);
        setDownloading(false);
      }, 5000);
      
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed. Please try again.');
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handlePlay = () => {
    if (!installed) {
      toast.error('Please install the game first');
      return;
    }
    toast.success(`Launching ${game.title}...`);
    // Ici vous pouvez ajouter la logique pour lancer le jeu
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <LoadingSpinner />;
  if (!game) return <div className="container">Game not found</div>;

  return (
    <div className="download-container">
      <button className="back-button" onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back
      </button>
      
      <div className="download-card">
        <div className="download-header">
          <img src={game.cover_image} alt={game.title} className="download-cover" />
          <div className="download-info">
            <h1>{game.title}</h1>
            <p className="game-description">{game.short_description || game.description}</p>
            <div className="game-details">
              <span className="detail">
                <FaInfoCircle /> Size: {formatFileSize(game.file_size || 0)}
              </span>
              <span className="detail">
                Version: {game.version || '1.0.0'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="download-actions">
          {!installed ? (
            <button 
              onClick={handleDownload}
              className="btn-download-game"
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <FaDownload className="spinning" />
                  Downloading... {downloadProgress}%
                </>
              ) : (
                <>
                  <FaDownload /> Download Game
                </>
              )}
            </button>
          ) : (
            <button 
              onClick={handlePlay}
              className="btn-play-game"
            >
              <FaPlay /> Play Now
            </button>
          )}
          
          {downloading && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}
        </div>
        
        {installed && (
          <div className="install-success">
            <FaCheck /> Game is installed and ready to play!
          </div>
        )}
        
        <div className="system-requirements">
          <h3>System Requirements</h3>
          <div className="requirements-grid">
            <div className="min-requirements">
              <h4>Minimum</h4>
              <ul>
                <li>OS: {game.system_requirements_min?.os || 'Not specified'}</li>
                <li>Processor: {game.system_requirements_min?.processor || 'Not specified'}</li>
                <li>Memory: {game.system_requirements_min?.memory || 'Not specified'}</li>
                <li>Graphics: {game.system_requirements_min?.graphics || 'Not specified'}</li>
                <li>Storage: {game.system_requirements_min?.storage || 'Not specified'}</li>
              </ul>
            </div>
            <div className="rec-requirements">
              <h4>Recommended</h4>
              <ul>
                <li>OS: {game.system_requirements_rec?.os || 'Not specified'}</li>
                <li>Processor: {game.system_requirements_rec?.processor || 'Not specified'}</li>
                <li>Memory: {game.system_requirements_rec?.memory || 'Not specified'}</li>
                <li>Graphics: {game.system_requirements_rec?.graphics || 'Not specified'}</li>
                <li>Storage: {game.system_requirements_rec?.storage || 'Not specified'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDownload;