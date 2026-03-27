import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaSearch, FaCheck, FaTimes, FaStar, FaEye, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './AdminGames.css';

const AdminGames = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const response = await api.get('/games/');
      setGames(response.data);
    } catch (error) {
      console.error('Failed to fetch games:', error);
      toast.error('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveGame = async (gameId) => {
    try {
      await api.patch(`/games/${gameId}/`, { status: 'approved', is_published: true });
      toast.success('Game approved and published');
      fetchGames();
    } catch (error) {
      console.error('Failed to approve game:', error);
      toast.error('Failed to approve game');
    }
  };

  const handleRejectGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to reject this game?')) return;
    
    try {
      await api.patch(`/games/${gameId}/`, { status: 'rejected', is_published: false });
      toast.success('Game rejected');
      fetchGames();
    } catch (error) {
      console.error('Failed to reject game:', error);
      toast.error('Failed to reject game');
    }
  };

  const handleFeatureGame = async (gameId) => {
    try {
      await api.patch(`/games/${gameId}/`, { status: 'featured' });
      toast.success('Game featured on homepage');
      fetchGames();
    } catch (error) {
      console.error('Failed to feature game:', error);
      toast.error('Failed to feature game');
    }
  };

  const handleDeleteGame = async (gameId) => {
    if (!window.confirm('Are you sure you want to delete this game? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/games/${gameId}/`);
      toast.success('Game deleted');
      fetchGames();
    } catch (error) {
      console.error('Failed to delete game:', error);
      toast.error('Failed to delete game');
    }
  };

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || game.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-games">
      <div className="page-header">
        <h1>Game Management</h1>
        <div className="filters">
          <div className="search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Search games..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Games</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="featured">Featured</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="games-table">
        <div className="table-header">
          <div>Game</div>
          <div>Developer</div>
          <div>Price</div>
          <div>Rating</div>
          <div>Downloads</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {filteredGames.map(game => (
          <div key={game.id} className="table-row">
            <div className="game-info">
              <img src={game.cover_image || '/placeholder.jpg'} alt={game.title} />
              <div>
                <strong>{game.title}</strong>
                <small>{game.short_description?.substring(0, 50)}</small>
              </div>
            </div>
            <div>{game.developer_name}</div>
            <div>${game.price}</div>
            <div className="rating">
              <FaStar /> {game.average_rating || 0} ({game.total_ratings})
            </div>
            <div>{game.total_downloads || 0}</div>
            <div>
              <span className={`status-badge ${game.status}`}>
                {game.status}
              </span>
            </div>
            <div className="actions">
              {game.status === 'pending' && (
                <>
                  <button onClick={() => handleApproveGame(game.id)} className="btn-approve" title="Approve">
                    <FaCheck />
                  </button>
                  <button onClick={() => handleRejectGame(game.id)} className="btn-reject" title="Reject">
                    <FaTimes />
                  </button>
                </>
              )}
              {game.status === 'approved' && (
                <button onClick={() => handleFeatureGame(game.id)} className="btn-feature" title="Feature">
                  <FaStar />
                </button>
              )}
              <button onClick={() => window.open(`/game/${game.id}`, '_blank')} className="btn-view" title="View">
                <FaEye />
              </button>
              <button onClick={() => handleDeleteGame(game.id)} className="btn-delete" title="Delete">
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminGames;