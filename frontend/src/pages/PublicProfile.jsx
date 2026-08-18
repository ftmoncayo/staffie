import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AboutSection from '../components/AboutSection'
import ConnectionButton from '../components/ConnectionButton'
import Tag from '../components/Tag'
import TagLevelInfo from '../components/TagLevelInfo'
import PersonCard from '../components/PersonCard'
import ActivityItem from '../components/ActivityItem'
import ShowMore from '../components/ShowMore'

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function rightToWorkLabel(countryName) {
  return countryName ? `Eligible to work in ${countryName}` : 'Eligible to work here'
}

function locationString(profile) {
  return (
    [profile.suburb?.name, profile.city?.name, profile.city?.state?.name, profile.city?.state?.country?.name]
      .filter(Boolean)
      .join(', ') || '—'
  )
}

function PublicProfile() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (userId === user?.id) {
      navigate('/profile', { replace: true })
      return
    }
    setLoading(true)
    setError('')
    api
      .fetchPublicProfile(userId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    api.fetchUserActivity(userId).then(setActivity).catch(() => {})
  }, [userId, user?.id, navigate])

  async function handleConnect() {
    const request = await api.requestConnection(userId)
    setData((prev) => ({
      ...prev,
      connectionStatus: request.status === 'PENDING' ? 'pending-sent' : prev.connectionStatus,
    }))
  }

  async function handleAccept() {
    await api.acceptConnectionRequest(data.connectionRequestId)
    setData((prev) => ({ ...prev, connectionStatus: 'connected' }))
  }

  async function handleDecline() {
    await api.declineConnectionRequest(data.connectionRequestId)
    setData((prev) => ({ ...prev, connectionStatus: 'none', connectionRequestId: null }))
  }

  async function handleRemove() {
    await api.removeConnection(userId)
    setData((prev) => ({ ...prev, connectionStatus: 'none', connectionRequestId: null }))
  }

  if (loading) return null

  if (error) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-danger">{error}</p>
          <Link to="/discover" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to discover
          </Link>
        </div>
      </div>
    )
  }

  if (data.unavailable) {
    return (
      <div className="min-h-screen bg-bg px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-text-faint">This profile is unavailable.</p>
          <Link to="/discover" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to discover
          </Link>
        </div>
      </div>
    )
  }

  const { profile } = data
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text">{name}</h1>
            <p className="text-sm text-text-faint">
              {data.mutualConnections.length} connection{data.mutualConnections.length === 1 ? '' : 's'} in
              common, {data.sharedVenuesCount} venue{data.sharedVenuesCount === 1 ? '' : 's'} in common
            </p>
          </div>
          <Link to="/discover" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to discover
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ConnectionButton
            status={data.connectionStatus}
            onConnect={handleConnect}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
          {data.connectionStatus === 'connected' && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-danger hover:underline"
            >
              Remove connection
            </button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold text-text">ID Card</h2>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-text-faint">Location</dt>
              <dd className="text-text">{locationString(profile)}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-faint">Professional title</dt>
              <dd className="text-text">{profile.professionalTitle}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-faint">{rightToWorkLabel(profile.city?.state?.country?.name)}</dt>
              <dd className="text-text">{profile.rightToWork ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-faint">Cultural identity / background</dt>
              <dd className="text-text">{profile.culturalIdentity || '—'}</dd>
            </div>
          </dl>
        </div>

        <AboutSection about={profile.about} canEdit={false} emptyMessage="Nothing here yet." />

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

        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-text">Skills</h2>
            <TagLevelInfo />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <Tag key={skill.id} level={skill.level}>
                {skill.name}
              </Tag>
            ))}
            {profile.skills.length === 0 && <p className="text-sm text-text-faint">No skills added yet.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-text">Knowledge Bank</h2>
            <TagLevelInfo />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.knowledgeAreas.map((area) => (
              <Tag key={area.id} level={area.level}>
                {area.name}
              </Tag>
            ))}
            {profile.knowledgeAreas.length === 0 && (
              <p className="text-sm text-text-faint">No knowledge areas added yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold text-text">Experience</h2>
          <div className="mt-4 flex flex-col gap-3">
            {profile.experiences.map((exp) => (
              <div key={exp.id} className="rounded border border-border p-4">
                <p className="font-medium text-text">{exp.roleTitle}</p>
                <Link
                  to={`/venues/${exp.venue.id}`}
                  className="text-sm text-accent hover:text-accent-hover hover:underline"
                >
                  {exp.venue.name}
                </Link>
                <p className="text-sm text-text-faint">
                  {formatDate(exp.startDate)} – {exp.isCurrent ? 'Current' : formatDate(exp.endDate) || '—'}
                </p>
              </div>
            ))}
            {profile.experiences.length === 0 && (
              <p className="text-sm text-text-faint">No experience added yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold text-text">Certifications</h2>
          <div className="mt-4 flex flex-col gap-3">
            {profile.certifications.map((cert) => (
              <div key={cert.id} className="rounded border border-border p-4">
                <p className="font-medium text-text">{cert.certificationType?.name}</p>
                <p className="text-sm text-text-faint">
                  Issued {formatDate(cert.issueDate)}
                  {cert.expiryDate ? ` · Expires ${formatDate(cert.expiryDate)}` : ''}
                </p>
              </div>
            ))}
            {profile.certifications.length === 0 && (
              <p className="text-sm text-text-faint">No certifications added yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-xl font-semibold text-text">Connections in common</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.mutualConnections.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
            {data.mutualConnections.length === 0 && (
              <p className="text-sm text-text-faint">No connections in common yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicProfile
