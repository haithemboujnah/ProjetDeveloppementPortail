import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Navbar from './components/common/Navbar';
import GameList from './components/games/GameList';
import GameDetail from './components/games/GameDetail';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Profile from './components/auth/Profile';
import Cart from './components/cart/Cart';
import Checkout from './components/cart/Checkout';
import MyLibrary from './components/library/MyLibrary';
import Wishlist from './components/wishlist/Wishlist';
import OrderHistory from './components/orders/OrderHistory';
import Notifications from './components/notifications/Notifications';
import UserDashboard from './components/dashboard/UserDashboard';
import PrivateRoute from './components/common/PrivateRoute';
import Footer from './components/common/Footer';

// Developer Components
import DeveloperDashboard from './components/developer/DeveloperDashboard';
import GameForm from './components/developer/GameForm';
import GameStats from './components/developer/GameStats';

import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers from './components/admin/AdminUsers';
import AdminGames from './components/admin/AdminGames';
import AdminReviews from './components/admin/AdminReviews';
import AdminGamesPending from './components/admin/AdminGamesPending';
import AdminReviewsReported from './components/admin/AdminReviewsReported';
import AdminAnalytics from './components/admin/AdminAnalytics';
import RecommendationsPage from './components/ai/RecommendationsPage';
import TrendingPage from './components/ai/TrendingPage';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <Navbar />
          <Notifications />
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<UserDashboard />} />
            <Route path="/games" element={<GameList />} />
            <Route path="/game/:id" element={<GameDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Routes privées utilisateur */}
            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            <Route path="/cart" element={
              <PrivateRoute>
                <Cart />
              </PrivateRoute>
            } />
            <Route path="/checkout" element={
              <PrivateRoute>
                <Checkout />
              </PrivateRoute>
            } />
            <Route path="/library" element={
              <PrivateRoute>
                <MyLibrary />
              </PrivateRoute>
            } />
            <Route path="/wishlist" element={
              <PrivateRoute>
                <Wishlist />
              </PrivateRoute>
            } />
            <Route path="/orders" element={
              <PrivateRoute>
                <OrderHistory />
              </PrivateRoute>
            } />
            
            {/* Routes développeur */}
            <Route path="/developer" element={
              <PrivateRoute requireDeveloper={true}>
                <DeveloperDashboard />
              </PrivateRoute>
            } />
            <Route path="/developer/games/new" element={
              <PrivateRoute requireDeveloper={true}>
                <GameForm />
              </PrivateRoute>
            } />
            <Route path="/developer/games/:id/edit" element={
              <PrivateRoute requireDeveloper={true}>
                <GameForm />
              </PrivateRoute>
            } />
            <Route path="/developer/games/:id/stats" element={
              <PrivateRoute requireDeveloper={true}>
                <GameStats />
              </PrivateRoute>
            } />

            <Route path="/admin" element={
              <PrivateRoute requireAdmin={true}>
                <AdminDashboard />
              </PrivateRoute>
            } />
            <Route path="/admin/users" element={
              <PrivateRoute requireAdmin={true}>
                <AdminUsers />
              </PrivateRoute>
            } />
            <Route path="/admin/games" element={
              <PrivateRoute requireAdmin={true}>
                <AdminGames />
              </PrivateRoute>
            } />
            <Route path="/admin/reviews" element={
              <PrivateRoute requireAdmin={true}>
                <AdminReviews />
              </PrivateRoute>
            } />

            <Route path="/admin/games/pending" element={
              <PrivateRoute requireAdmin={true}>
                <AdminGamesPending />
              </PrivateRoute>
            } />
            <Route path="/admin/reviews/reported" element={
              <PrivateRoute requireAdmin={true}>
                <AdminReviewsReported />
              </PrivateRoute>
            } />
            <Route path="/admin/analytics" element={
              <PrivateRoute requireAdmin={true}>
                <AdminAnalytics />
              </PrivateRoute>
            } />

            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/trending" element={<TrendingPage />} /> 

          </Routes>
          <Footer />
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;