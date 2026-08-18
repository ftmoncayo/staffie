import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Waitlist from './pages/Waitlist'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import PublicProfile from './pages/PublicProfile'
import VenueDirectory from './pages/VenueDirectory'
import VenueCreate from './pages/VenueCreate'
import VenueDetail from './pages/VenueDetail'
import BusinessDirectory from './pages/BusinessDirectory'
import BusinessCreate from './pages/BusinessCreate'
import BusinessDetail from './pages/BusinessDetail'
import AdminVenues from './pages/AdminVenues'
import AdminBusinesses from './pages/AdminBusinesses'
import AdminUsers from './pages/AdminUsers'
import AdminJobs from './pages/AdminJobs'
import AdminLookups from './pages/AdminLookups'
import AdminRegistration from './pages/AdminRegistration'
import DiscoverPeople from './pages/DiscoverPeople'
import InviteSomeone from './pages/InviteSomeone'
import ConnectionRequests from './pages/ConnectionRequests'
import Notifications from './pages/Notifications'
import Connections from './pages/Connections'
import JobsDirectory from './pages/JobsDirectory'
import JobCreate from './pages/JobCreate'
import JobDetail from './pages/JobDetail'
import JobApplications from './pages/JobApplications'
import EventsDirectory from './pages/EventsDirectory'
import EventCreate from './pages/EventCreate'
import EventDetail from './pages/EventDetail'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import TopNav from './components/TopNav'

function App() {
  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/home"
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
          path="/venues/mine"
          element={
            <ProtectedRoute>
              <VenueDirectory mine />
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
          path="/businesses"
          element={
            <ProtectedRoute>
              <BusinessDirectory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/businesses/mine"
          element={
            <ProtectedRoute>
              <BusinessDirectory mine />
            </ProtectedRoute>
          }
        />
        <Route
          path="/businesses/new"
          element={
            <ProtectedRoute>
              <BusinessCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/businesses/:id"
          element={
            <ProtectedRoute>
              <BusinessDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <JobsDirectory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/mine"
          element={
            <ProtectedRoute>
              <JobsDirectory mine />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute>
              <JobDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:id/applications"
          element={
            <ProtectedRoute>
              <JobApplications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/venues/:venueId/jobs/new"
          element={
            <ProtectedRoute>
              <JobCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <EventsDirectory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/mine"
          element={
            <ProtectedRoute>
              <EventsDirectory mine />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute>
              <EventDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/venues/:ownerId/events/new"
          element={
            <ProtectedRoute>
              <EventCreate ownerType="VENUE" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/businesses/:ownerId/events/new"
          element={
            <ProtectedRoute>
              <EventCreate ownerType="BUSINESS" />
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
          path="/invite"
          element={
            <ProtectedRoute>
              <InviteSomeone />
            </ProtectedRoute>
          }
        />
        <Route
          path="/connections"
          element={
            <ProtectedRoute>
              <Connections />
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
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/venues"
          element={
            <AdminRoute allowVenueAdmin>
              <AdminVenues />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/businesses"
          element={
            <AdminRoute>
              <AdminBusinesses />
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
        <Route
          path="/admin/jobs"
          element={
            <AdminRoute>
              <AdminJobs />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/lookups"
          element={
            <AdminRoute>
              <AdminLookups />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/registration"
          element={
            <AdminRoute>
              <AdminRegistration />
            </AdminRoute>
          }
        />
      </Routes>
    </>
  )
}

export default App
