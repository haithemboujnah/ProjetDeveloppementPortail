import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './AdminGames.css';

const AdminGamesPending = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingGames();
  }, []);

  const fetchPendingGames = async () => {
    try {
      setLoading(true);
      const response = await api.get('/games/');
      let gamesData = Array.isArray(response.data) ? response.data : response.data.results || [];
      const pendingGames = gamesData.filter(game => game.status === 'pending');
      setGames(pendingGames);
    } catch (error) {
      console.error('Failed to fetch pending games:', error);
      toast.error('Failed to load pending games');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveGame = async (gameId) => {
    try {
      await api.patch(`/games/${gameId}/`, { status: 'approved', is_published: true });
      toast.success('Game approved and published');
      fetchPendingGames();
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
      fetchPendingGames();
    } catch (error) {
      console.error('Failed to reject game:', error);
      toast.error('Failed to reject game');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-games">
      <div className="page-header">
        <h1>Pending Games Approval</h1>
        <p>Review and approve games submitted by developers</p>
      </div>

      {games.length === 0 ? (
        <div className="no-data">
          <p>No pending games to review</p>
        </div>
      ) : (
        <div className="games-table">
          <div className="table-header">
            <div>Game</div>
            <div>Developer</div>
            <div>Price</div>
            <div>Submitted</div>
            <div>Actions</div>
          </div>
          {games.map(game => (
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
              <div>{new Date(game.release_date).toLocaleDateString()}</div>
              <div className="actions">
                <button onClick={() => handleApproveGame(game.id)} className="btn-approve" title="Approve">
                  <FaCheck /> Approve
                </button>
                <button onClick={() => handleRejectGame(game.id)} className="btn-reject" title="Reject">
                  <FaTimes /> Reject
                </button>
                <button onClick={() => window.open(`/game/${game.id}`, '_blank')} className="btn-view" title="View">
                  <FaEye />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminGamesPending;