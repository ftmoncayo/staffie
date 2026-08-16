import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import BusinessForm from '../components/business/BusinessForm'
import BusinessManagersPanel from '../components/business/BusinessManagersPanel'
import VerificationBadge from '../components/venue/VerificationBadge'
import AboutSection from '../components/AboutSection'
import NominateManagerButton from '../components/NominateManagerButton'

function BusinessDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [business, setBusiness] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchBusiness(id)
      .then(setBusiness)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(data) {
    const updated = await api.updateBusiness(id, data)
    setBusiness(updated)
    setEditing(false)
  }

  async function handleSaveAbout(about) {
    const updated = await api.saveBusinessAbout(id, about)
    setBusiness(updated)
  }

  async function handleToggleFollow() {
    const isFollowing = business.isFollowing
      ? await api.unfollowBusiness(id)
      : await api.followBusiness(id)
    setBusiness((prev) => ({ ...prev, isFollowing, isFavourite: isFollowing ? prev.isFavourite : false }))
  }

  async function handleToggleFavourite() {
    const result = await api.favouriteBusiness(id)
    setBusiness((prev) => ({ ...prev, isFollowing: result.isFollowing, isFavourite: result.isFavourite }))
  }

  if (loading) return null

  if (error) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-danger">{error}</p>
          <Link to="/businesses" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to businesses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Business</h1>
          <Link to="/businesses" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to businesses
          </Link>
        </div>

        {editing ? (
          <BusinessForm
            initial={business}
            isEditing
            onSubmit={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text">{business.name}</h2>
                <div className="mt-1">
                  <VerificationBadge status={business.verificationStatus} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={
                    business.isFollowing
                      ? 'rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover'
                      : 'rounded bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:bg-accent-hover'
                  }
                >
                  {business.isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <button
                  type="button"
                  onClick={handleToggleFavourite}
                  aria-label={business.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                  className={
                    business.isFavourite
                      ? 'rounded border border-accent px-3 py-1.5 text-sm text-accent'
                      : 'rounded border border-border-strong px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover'
                  }
                >
                  {business.isFavourite ? '★ Favourited' : '☆ Favourite'}
                </button>
                {business.canEdit && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm text-accent hover:text-accent-hover hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-text-faint">Category</dt>
                <dd className="text-text">{business.category?.name || '—'}</dd>
              </div>
            </dl>
          </div>
        )}

        {!business.canEdit && (
          <NominateManagerButton
            label="Request to manage this business"
            onSubmit={(message) => api.nominateBusinessManager(id, message)}
          />
        )}

        <AboutSection
          about={business.about}
          canEdit={business.canEdit}
          onSave={handleSaveAbout}
          emptyMessage={
            business.canEdit ? 'Add an introduction for this business.' : 'No introduction added yet.'
          }
        />

        {user?.isAdmin && <BusinessManagersPanel businessId={id} />}
      </div>
    </div>
  )
}

export default BusinessDetail
