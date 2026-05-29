import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../../services/game';
import { AuthContext } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';
import api from '../../services/api';
import { FaDownload, FaPlay, FaTrash, FaInfoCircle, FaGamepad } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './Library.css';

const MyLibrary = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [playing, setPlaying] = useState(null);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const fetchLibrary = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await gameService.getUserLibrary();
      
      // Le format attendu de l'API
      const gamesArray = Array.isArray(data) ? data : [];
      
      setGames(gamesArray);
      console.log('Library loaded:', gamesArray);
    } catch (error) {
      console.error('Failed to fetch library:', error);
      setError('Failed to load your library. Please try again later.');
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  // Dans handlePlay
  const handlePlay = async (game) => {
    if (!game.is_installed) {
      toast.error('Game not installed. Please download it first.');
      return;
    }
    
    setPlaying(game.id);
    
    try {
      const response = await api.post(`/games/my-library/${game.id}/play/`);
      toast.success(`Launching ${game.game_title}...`);
      
      // Simuler le lancement du jeu
      setTimeout(() => {
        toast.success(`Enjoy playing ${game.game_title}!`);
      }, 2000);
      
      // Rafraîchir pour mettre à jour le temps de jeu
      fetchLibrary();
    } catch (error) {
      console.error('Failed to launch game:', error);
      toast.error('Failed to launch game. Please try again.');
    } finally {
      setPlaying(null);
    }
  };

  // Dans handleDownload
  const handleDownload = async (game) => {
    if (game.is_installed) {
      toast.info('Game is already installed.');
      return;
    }
    
    setDownloading(game.id);
    
    try {
      toast.loading(`Preparing download for ${game.game_title}...`, { id: 'download' });
      
      const response = await api.get(`/games/my-library/${game.id}/download/`);
      const downloadUrl = response.data.download_url;
      
      if (downloadUrl) {
        // Créer un lien de téléchargement
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${game.game_title}.exe`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`Download started for ${game.game_title}!`, { id: 'download' });
        
        // Simuler l'installation après téléchargement
        setTimeout(async () => {
          try {
            await api.patch(`/games/my-library/${game.id}/update/`, {
              is_installed: true,
              install_path: `C:/Games/${game.game_title.replace(/[^a-z0-9]/gi, '_')}`
            });
            
            toast.success(`${game.game_title} installed successfully!`);
            fetchLibrary(); // Rafraîchir
          } catch (error) {
            console.error('Failed to mark as installed:', error);
          }
        }, 5000);
      } else {
        toast.error('No download available for this game.', { id: 'download' });
      }
    } catch (error) {
      console.error('Failed to download game:', error);
      toast.error('Failed to download game. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  // Dans handleRemove
  const handleRemove = async (game) => {
    if (!window.confirm(`Are you sure you want to remove "${game.game_title}" from your library?`)) {
      return;
    }
    
    try {
      await api.delete(`/games/my-library/${game.id}/remove/`);
      toast.success(`${game.game_title} removed from library`);
      fetchLibrary(); // Rafraîchir
    } catch (error) {
      console.error('Failed to remove game:', error);
      toast.error('Failed to remove game from library');
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Fonction pour obtenir l'URL de l'image
  const getImageUrl = (game) => {
    const possibleImageFields = [
      game.cover_image,
      game.game_cover,
      game.cover,
      game.image,
      game.thumbnail
    ];
    
    for (const field of possibleImageFields) {
      if (field && field !== '' && field !== 'null' && field !== 'undefined') {
        if (field.startsWith('http://') || field.startsWith('https://')) {
          return field;
        }
        if (field.startsWith('/')) {
          return `http://localhost:8000${field}`;
        }
        return field;
      }
    }
    
    return 'https://cdn-icons-png.freepik.com/512/10809/10809585.png';
  };

  // Fonction pour voir les détails du jeu
  const handleViewDetails = (game) => {
    navigate(`/game/${game.id}`);
  };

  // Fonction pour formater le temps de jeu
  const formatPlaytime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0 && mins === 0) return 'Never played';
    if (hours === 0) return `${mins} minutes`;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="container library-container">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchLibrary} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="container library-container">
        <div className="empty-library">
          <FaGamepad size={64} color="#888" />
          <h2>Your library is empty</h2>
          <p>Purchase games to add them to your library and start playing!</p>
          <button 
            onClick={() => navigate('/')}
            className="btn btn-primary"
          >
            Browse Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container library-container">
      <div className="library-header">
        <h2>My Library</h2>
        <p className="library-count">{games.length} game(s) in your library</p>
      </div>
      
      <div className="library-grid">
        {games.map((game) => (
          <div key={game.id} className="library-item">
            <div className="library-item-image">
              <img 
                src={getImageUrl(game)} 
                alt={game.title}
                onClick={() => handleViewDetails(game)}
                onError={(e) => {
                  console.error(`Failed to load image for ${game.title}:`, getImageUrl(game));
                  e.target.onerror = null;
                  e.target.src = 'https://cdn-icons-png.freepik.com/512/10809/10809585.png';
                }}
              />
              {game.is_installed && (
                <span className="installed-badge">✓ Installed</span>
              )}
            </div>
            
            <div className="library-item-info">
              <h3 onClick={() => handleViewDetails(game)}>{game.title}</h3>
              <p className="playtime">
                <FaGamepad size={12} /> {formatPlaytime(game.playtime)}
              </p>
              {game.last_played && (
                <p className="last-played">
                  Last played: {new Date(game.last_played).toLocaleDateString()}
                </p>
              )}
              <div className="library-actions">
                <button 
                  onClick={() => handlePlay(game)}
                  className={`btn-play ${!game.is_installed ? 'disabled' : ''}`}
                  disabled={!game.is_installed || playing === game.id}
                >
                  {playing === game.id ? (
                    <span>Launching...</span>
                  ) : (
                    <>
                      <FaPlay /> Play
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => handleDownload(game)}
                  className={`btn-download ${game.is_installed ? 'installed' : ''}`}
                  disabled={downloading === game.id || game.is_installed}
                >
                  {downloading === game.id ? (
                    <span>Downloading...</span>
                  ) : game.is_installed ? (
                    <>
                      <FaDownload /> Installed
                    </>
                  ) : (
                    <>
                      <FaDownload /> Download
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => handleViewDetails(game)}
                  className="btn-details"
                  title="View Details"
                >
                  <FaInfoCircle />
                </button>
                
                <button 
                  onClick={() => handleRemove(game)}
                  className="btn-remove"
                  title="Remove from Library"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyLibrary;