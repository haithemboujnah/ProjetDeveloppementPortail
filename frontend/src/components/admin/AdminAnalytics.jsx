import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { FaDownload, FaUsers, FaGamepad, FaDollarSign, FaStar } from 'react-icons/fa';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import toast from 'react-hot-toast';
import './AdminAnalytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ by_role: [], monthly: [] });
  const [gameStats, setGameStats] = useState({ by_status: [], by_category: [], top_downloads: [] });
  const [reviewStats, setReviewStats] = useState({ by_rating: [], monthly: [] });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [usersRes, gamesRes, reviewsRes] = await Promise.all([
        api.get('/users/stats/users/'),
        api.get('/users/stats/games/'),
        api.get('/users/stats/reviews/')
      ]);
      
      setUserStats(usersRes.data);
      setGameStats(gamesRes.data);
      setReviewStats(reviewsRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const userChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'New Users',
      data: userStats.monthly || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      borderColor: '#00fff9',
      backgroundColor: 'rgba(0, 255, 249, 0.1)',
      fill: true
    }]
  };

  const reviewChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{
      label: 'New Reviews',
      data: reviewStats.monthly || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      borderColor: '#ff00e5',
      backgroundColor: 'rgba(255, 0, 229, 0.1)',
      fill: true
    }]
  };

  const ratingData = {
    labels: reviewStats.by_rating?.map(r => `${r.rating}★`) || [],
    datasets: [{
      label: 'Number of Reviews',
      data: reviewStats.by_rating?.map(r => r.count) || [],
      backgroundColor: '#9d00ff'
    }]
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="admin-analytics">
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
        <p>Detailed platform analytics and insights</p>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3><FaUsers /> User Growth</h3>
          <Line data={userChartData} options={{ responsive: true }} />
        </div>

        <div className="analytics-card">
          <h3><FaStar /> Review Activity</h3>
          <Line data={reviewChartData} options={{ responsive: true }} />
        </div>

        <div className="analytics-card">
          <h3>Rating Distribution</h3>
          <Bar data={ratingData} options={{ responsive: true }} />
        </div>

        <div className="analytics-card">
          <h3><FaGamepad /> Top Downloads</h3>
          <div className="top-downloads">
            {gameStats.top_downloads?.slice(0, 5).map((game, index) => (
              <div key={game.id} className="download-item">
                <span className="rank">#{index + 1}</span>
                <span className="title">{game.title}</span>
                <span className="count">{game.total_downloads} downloads</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;