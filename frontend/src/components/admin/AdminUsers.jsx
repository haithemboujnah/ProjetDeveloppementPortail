import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaSearch, FaBan, FaCheck, FaEdit, FaTrash, FaUserCog } from 'react-icons/fa';
import toast from 'react-hot-toast';
import './AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/');
      
      // S'assurer que les données sont un tableau
      let usersData = [];
      if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data && response.data.results) {
        usersData = response.data.results;
      } else if (response.data && typeof response.data === 'object') {
        usersData = Object.values(response.data);
      }
      
      console.log('Users data:', usersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId) => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    
    try {
      await api.patch(`/users/${userId}/`, { is_active: false });
      toast.success('User banned successfully');
      fetchUsers();
    } catch (error) {
      console.error('Failed to ban user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await api.patch(`/users/${userId}/`, { is_active: true });
      toast.success('User unbanned successfully');
      fetchUsers();
    } catch (error) {
      console.error('Failed to unban user:', error);
      toast.error('Failed to unban user');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.patch(`/users/${userId}/`, { role: newRole });
      toast.success(`User role changed to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to change role:', error);
      toast.error('Failed to change role');
    }
  };

  // Filtrer les utilisateurs avec vérification que users est un tableau
  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    const matchesSearch = user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  }) : [];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-users">
      <div className="page-header">
        <h1>User Management</h1>
        <div className="filters">
          <div className="search-box">
            <FaSearch />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="user">Gamers</option>
            <option value="developer">Developers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="no-data">
          <p>No users found</p>
        </div>
      ) : (
        <div className="users-table">
          <div className="table-header">
            <div>User</div>
            <div>Email</div>
            <div>Role</div>
            <div>Games</div>
            <div>Reviews</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          {filteredUsers.map(user => (
            <div key={user.id} className="table-row">
              <div className="user-info">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  <div className="avatar-placeholder">{user.username?.[0]?.toUpperCase() || 'U'}</div>
                )}
                <span>{user.username}</span>
              </div>
              <div>{user.email}</div>
              <div>
                <select 
                  value={user.role} 
                  onChange={(e) => handleChangeRole(user.id, e.target.value)}
                  className="role-select"
                >
                  <option value="user">Gamer</option>
                  <option value="developer">Developer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>{user.owned_games_count || 0}</div>
              <div>{user.reviews_count || 0}</div>
              <div>
                <span className={`status-badge ${user.is_active ? 'active' : 'banned'}`}>
                  {user.is_active ? 'Active' : 'Banned'}
                </span>
              </div>
              <div className="actions">
                {user.is_active ? (
                  <button onClick={() => handleBanUser(user.id)} className="btn-ban" title="Ban User">
                    <FaBan />
                  </button>
                ) : (
                  <button onClick={() => handleUnbanUser(user.id)} className="btn-unban" title="Unban User">
                    <FaCheck />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;