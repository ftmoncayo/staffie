import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as api from '../lib/api'
import ActivityItem from '../components/ActivityItem'
import PostItem from '../components/PostItem'
import PersonCard from '../components/PersonCard'
import ConnectionButton from '../components/ConnectionButton'
import SearchCombobox from '../components/SearchCombobox'
import ShowMore from '../components/ShowMore'

function Dashboard() {
  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [posts, setPosts] = useState([])
  const [cityFilter, setCityFilter] = useState(null)
  const [postContent, setPostContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unverifiedVenueCount, setUnverifiedVenueCount] = useState(null)
  const [unverifiedBusinessCount, setUnverifiedBusinessCount] = useState(null)
  const [profileComplete, setProfileComplete] = useState(true)

  useEffect(() => {
    api
      .fetchFeed()
      .then((data) => {
        setActivities(data.activities)
        setSuggestions(data.suggestions)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    api
      .fetchProfile()
      .then((data) => {
        if (data.profile?.city) setCityFilter(data.profile.city)
        setProfileComplete(Boolean(data.profile?.professionalTitle))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.isAdmin || user?.isVenueAdmin) {
      api
        .fetchVenues({ status: 'UNVERIFIED', includeManaged: true })
        .then((venues) => setUnverifiedVenueCount(venues.length))
    }
    if (user?.isAdmin) {
      api
        .fetchBusinesses({ status: 'UNVERIFIED', includeManaged: true })
        .then((businesses) => setUnverifiedBusinessCount(businesses.length))
    }
  }, [user])

  useEffect(() => {
    if (!cityFilter) {
      setPosts([])
      return
    }
    api.fetchPosts(cityFilter.id).then(setPosts).catch((err) => setError(err.message))
  }, [cityFilter])

  function updateSuggestion(userId, changes) {
    setSuggestions((prev) => prev.map((p) => (p.id === userId ? { ...p, ...changes } : p)))
  }

  async function handleConnect(person) {
    const request = await api.requestConnection(person.id)
    updateSuggestion(person.id, {
      connectionStatus: request.status === 'PENDING' ? 'pending-sent' : person.connectionStatus,
    })
  }

  async function handleAccept(person) {
    await api.acceptConnectionRequest(person.connectionRequestId)
    updateSuggestion(person.id, { connectionStatus: 'connected' })
  }

  async function handleDecline(person) {
    await api.declineConnectionRequest(person.connectionRequestId)
    updateSuggestion(person.id, { connectionStatus: 'none', connectionRequestId: null })
  }

  async function handleCreatePost(e) {
    e.preventDefault()
    if (!postContent.trim()) return
    setPostError('')
    setPosting(true)
    try {
      await api.createPost(postContent.trim())
      setPostContent('')
      if (cityFilter) {
        setPosts(await api.fetchPosts(cityFilter.id))
      }
    } catch (err) {
      setPostError(err.message)
    } finally {
      setPosting(false)
    }
  }

  async function handleDeletePost(id) {
    await api.deletePost(id)
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const feedItems = useMemo(() => {
    const activityItems = activities.map((a) => ({
      kind: 'activity',
      id: `activity-${a.id}`,
      createdAt: a.createdAt,
      data: a,
    }))
    const postItems = posts.map((p) => ({ kind: 'post', id: `post-${p.id}`, createdAt: p.createdAt, data: p }))

    return [...activityItems, ...postItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [activities, posts])

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text">Home</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link to="/invite" className="text-accent hover:text-accent-hover hover:underline">
              Invite someone
            </Link>
            {(user?.isAdmin || user?.isVenueAdmin) && (
              <Link to="/admin/venues" className="text-accent hover:text-accent-hover hover:underline">
                Venue Admin{unverifiedVenueCount !== null ? ` (${unverifiedVenueCount})` : ''}
              </Link>
            )}
            {user?.isAdmin && (
              <Link to="/admin/businesses" className="text-accent hover:text-accent-hover hover:underline">
                Business Admin
                {unverifiedBusinessCount !== null ? ` (${unverifiedBusinessCount})` : ''}
              </Link>
            )}
            {user?.isAdmin && (
              <Link to="/admin/users" className="text-accent hover:text-accent-hover hover:underline">
                Users
              </Link>
            )}
            {user?.isAdmin && (
              <Link to="/admin/jobs" className="text-accent hover:text-accent-hover hover:underline">
                Job Admin
              </Link>
            )}
            {user?.isAdmin && (
              <Link to="/admin/lookups" className="text-accent hover:text-accent-hover hover:underline">
                Lookup Data
              </Link>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {!profileComplete && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent bg-surface p-4">
            <p className="text-sm text-text">
              Your profile is incomplete — add your name, title, and city so people can find you.
            </p>
            <Link
              to="/profile"
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover"
            >
              Create your profile
            </Link>
          </div>
        )}

        <form
          onSubmit={handleCreatePost}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6"
        >
          {postError && <p className="text-sm text-danger">{postError}</p>}
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Share a notice with your city..."
            rows={3}
            className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
          />
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              City
              <div className="w-56">
                <SearchCombobox
                  fetchOptions={api.fetchCities}
                  onSelect={setCityFilter}
                  allowCreate={false}
                  initialQuery={cityFilter?.name || ''}
                  placeholder="Search for a city..."
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={posting || !postContent.trim()}
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-text">Activity</h2>
          {!loading && (
            <ShowMore
              items={feedItems}
              initialCount={5}
              incrementCount={5}
              emptyMessage="No activity yet. Connect with people, follow venues or businesses, or post a notice to see updates here."
              renderItem={(item) =>
                item.kind === 'post' ? (
                  <PostItem
                    key={item.id}
                    post={item.data}
                    canDelete={Boolean(user?.isAdmin)}
                    onDelete={handleDeletePost}
                  />
                ) : (
                  <ActivityItem key={item.id} activity={item.data} />
                )
              }
            />
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold text-text">People in your industry</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {suggestions.map((person) => (
                <PersonCard key={person.id} person={person}>
                  <ConnectionButton
                    status={person.connectionStatus}
                    onConnect={() => handleConnect(person)}
                    onAccept={() => handleAccept(person)}
                    onDecline={() => handleDecline(person)}
                  />
                </PersonCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
