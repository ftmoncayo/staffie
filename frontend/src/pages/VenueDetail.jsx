import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import VenueForm from '../components/venue/VenueForm'
import VerificationBadge from '../components/venue/VerificationBadge'
import VenueManagersPanel from '../components/venue/VenueManagersPanel'
import VenueWorkers from '../components/venue/VenueWorkers'
import Tag from '../components/Tag'
import AboutSection from '../components/AboutSection'
import NominateManagerButton from '../components/NominateManagerButton'
import PostNoticeBox from '../components/PostNoticeBox'
import ActivityItem from '../components/ActivityItem'
import ShowMore from '../components/ShowMore'

function VenueDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [venue, setVenue] = useState(null)
  const [activity, setActivity] = useState([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchVenue(id)
      .then(setVenue)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  function refreshActivity() {
    return api.fetchVenueActivity(id).then(setActivity)
  }

  useEffect(() => {
    refreshActivity().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSave(data) {
    const updated = await api.updateVenue(id, data)
    setVenue(updated)
    setEditing(false)
  }

  async function handleSaveAbout(about) {
    const updated = await api.saveVenueAbout(id, about)
    setVenue(updated)
  }

  async function handleToggleFollow() {
    const isFollowing = venue.isFollowing ? await api.unfollowVenue(id) : await api.followVenue(id)
    setVenue((prev) => ({ ...prev, isFollowing, isFavourite: isFollowing ? prev.isFavourite : false }))
  }

  async function handleToggleFavourite() {
    const result = await api.favouriteVenue(id)
    setVenue((prev) => ({ ...prev, isFollowing: result.isFollowing, isFavourite: result.isFavourite }))
  }

  if (loading) return null

  if (error) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-danger">{error}</p>
          <Link to="/venues" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to venues
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Venue</h1>
          <Link to="/venues" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to venues
          </Link>
        </div>

        {editing ? (
          <VenueForm initial={venue} isEditing onSubmit={handleSave} onCancel={() => setEditing(false)} />
        ) : (
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text">{venue.name}</h2>
                <div className="mt-1">
                  <VerificationBadge status={venue.verificationStatus} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={
                    venue.isFollowing
                      ? 'rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover'
                      : 'rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover'
                  }
                >
                  {venue.isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <button
                  type="button"
                  onClick={handleToggleFavourite}
                  aria-label={venue.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                  className={
                    venue.isFavourite
                      ? 'rounded border border-accent px-3 py-1.5 text-sm text-accent'
                      : 'rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover'
                  }
                >
                  {venue.isFavourite ? '★ Favourited' : '☆ Favourite'}
                </button>
                {venue.canEdit && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-accent hover:text-accent-hover hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {venue.hasExperienceHere && (
              <Link
                to={`/invite?venueId=${id}`}
                className="mt-3 inline-block text-sm text-accent hover:text-accent-hover hover:underline"
              >
                Invite a coworker
              </Link>
            )}

            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-text-faint">Location</dt>
                <dd className="text-text">
                  {[venue.city?.name, venue.state, venue.suburb?.name, venue.country]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-faint">Type</dt>
                <dd className="text-text">{venue.venueType?.name || '—'}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <dt className="text-sm text-text-faint">Specialties</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {venue.specialties.length === 0 && <span className="text-text">—</span>}
                {venue.specialties.map((s) => (
                  <Tag key={s.id}>{s.name}</Tag>
                ))}
              </dd>
            </div>
          </div>
        )}

        {!venue.canEdit && (
          <NominateManagerButton
            label="Request to manage this venue"
            onSubmit={(message) => api.nominateVenueManager(id, message)}
          />
        )}

        <AboutSection
          about={venue.about}
          canEdit={venue.canEdit}
          onSave={handleSaveAbout}
          emptyMessage={
            venue.canEdit ? 'Add an introduction for this venue.' : 'No introduction added yet.'
          }
        />

        {venue.isManager && (
          <PostNoticeBox
            onSubmit={(content) => api.postVenueNotice(id, content)}
            onPosted={refreshActivity}
          />
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-text">Recent activity</h2>
          <ShowMore
            items={activity}
            initialCount={2}
            incrementCount={5}
            emptyMessage="No activity yet."
            renderItem={(item) => <ActivityItem key={item.id} activity={item} />}
          />
        </div>

        <VenueWorkers venueId={id} />

        {(user?.isAdmin || user?.isVenueAdmin) && <VenueManagersPanel venueId={id} />}
      </div>
    </div>
  )
}

export default VenueDetail
