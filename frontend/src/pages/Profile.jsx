import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import ProfileDetails from '../components/profile/ProfileDetails'
import SkillsEditor from '../components/profile/SkillsEditor'
import KnowledgeAreaEditor from '../components/profile/KnowledgeAreaEditor'
import ExperienceEditor from '../components/profile/ExperienceEditor'
import CertificationsEditor from '../components/profile/CertificationsEditor'
import ConnectionsList from '../components/profile/ConnectionsList'
import AboutSection from '../components/AboutSection'
import ActivityItem from '../components/ActivityItem'
import ShowMore from '../components/ShowMore'

function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteVenue, setInviteVenue] = useState(() => {
    try {
      const raw = localStorage.getItem('staffie_invite_venue')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [prefillVenue, setPrefillVenue] = useState(null)

  function handleDismissInviteVenue() {
    localStorage.removeItem('staffie_invite_venue')
    setInviteVenue(null)
  }

  function handleAddInviteExperience() {
    setPrefillVenue(inviteVenue)
    handleDismissInviteVenue()
  }

  useEffect(() => {
    api
      .fetchProfile()
      .then((data) => setProfile(data.profile))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    api.fetchUserActivity(user.id).then(setActivity).catch(() => {})
  }, [user])

  async function refresh() {
    const data = await api.fetchProfile()
    setProfile(data.profile)
  }

  async function handleSaveDetails(data) {
    const result = await api.saveProfile(data)
    setProfile(result.profile)
  }

  async function handleAddSkill(name) {
    await api.addSkill(name)
    await refresh()
  }

  async function handleRemoveSkill(name) {
    await api.removeSkill(name)
    await refresh()
  }

  async function handleAddKnowledgeArea(name) {
    await api.addKnowledgeArea(name)
    await refresh()
  }

  async function handleRemoveKnowledgeArea(name) {
    await api.removeKnowledgeArea(name)
    await refresh()
  }

  async function handleCreateExperience(data) {
    await api.createExperience(data)
    await refresh()
  }

  async function handleUpdateExperience(id, data) {
    await api.updateExperience(id, data)
    await refresh()
  }

  async function handleDeleteExperience(id) {
    await api.deleteExperience(id)
    await refresh()
  }

  async function handleCreateCertification(data) {
    await api.createCertification(data)
    await refresh()
  }

  async function handleUpdateCertification(id, data) {
    await api.updateCertification(id, data)
    await refresh()
  }

  async function handleDeleteCertification(id) {
    await api.deleteCertification(id)
    await refresh()
  }

  async function handleSaveAbout(about) {
    const updated = await api.saveProfileAbout(about)
    setProfile(updated)
  }

  if (loading) {
    return null
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Your profile</h1>
          <Link to="/home" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to home
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {inviteVenue && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent bg-surface p-4">
            <p className="text-sm text-text">
              Did you work at <span className="font-medium">{inviteVenue.name}</span>?
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddInviteExperience}
                className="rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover"
              >
                Add to your experience
              </button>
              <button
                type="button"
                onClick={handleDismissInviteVenue}
                className="text-sm text-text-muted hover:text-text"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <ProfileDetails profile={profile} onSave={handleSaveDetails} />

        <AboutSection
          about={profile?.about}
          canEdit={Boolean(profile)}
          onSave={handleSaveAbout}
          emptyMessage={
            profile
              ? 'Add an introduction to tell people about yourself.'
              : 'Complete your ID Card above before adding an introduction.'
          }
        />

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

        <SkillsEditor profile={profile} onAdd={handleAddSkill} onRemove={handleRemoveSkill} />

        <KnowledgeAreaEditor
          profile={profile}
          onAdd={handleAddKnowledgeArea}
          onRemove={handleRemoveKnowledgeArea}
        />

        <ExperienceEditor
          profile={profile}
          experiences={profile?.experiences || []}
          onCreate={handleCreateExperience}
          onUpdate={handleUpdateExperience}
          onDelete={handleDeleteExperience}
          prefillVenue={prefillVenue}
        />

        <CertificationsEditor
          profile={profile}
          certifications={profile?.certifications || []}
          onCreate={handleCreateCertification}
          onUpdate={handleUpdateCertification}
          onDelete={handleDeleteCertification}
        />

        <ConnectionsList />
      </div>
    </div>
  )
}

export default Profile
