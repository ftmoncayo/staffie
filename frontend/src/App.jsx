import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import PublicProfile from './pages/PublicProfile'
import VenueDirectory from './pages/VenueDirectory'
import VenueCreate from './pages/VenueCreate'
import VenueDetail from './pages/VenueDetail'
import AdminVenues from './pages/AdminVenues'
import AdminUsers from './pages/AdminUsers'
import DiscoverPeople from './pages/DiscoverPeople'
import ConnectionRequests from './pages/ConnectionRequests'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:userId"
        element={
          <ProtectedRoute>
            <PublicProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/venues"
        element={
          <ProtectedRoute>
            <VenueDirectory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/venues/new"
        element={
          <ProtectedRoute>
            <VenueCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/venues/:id"
        element={
          <ProtectedRoute>
            <VenueDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <DiscoverPeople />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connections/requests"
        element={
          <ProtectedRoute>
            <ConnectionRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/venues"
        element={
          <AdminRoute>
            <AdminVenues />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />
    </Routes>
  )
}

export default App
