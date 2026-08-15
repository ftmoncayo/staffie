import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import ProfileDetails from '../components/profile/ProfileDetails'
import SkillsEditor from '../components/profile/SkillsEditor'
import KnowledgeAreaEditor from '../components/profile/KnowledgeAreaEditor'
import ExperienceEditor from '../components/profile/ExperienceEditor'
import CertificationsEditor from '../components/profile/CertificationsEditor'
import ConnectionsList from '../components/profile/ConnectionsList'
import AboutSection from '../components/AboutSection'

function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .fetchProfile()
      .then((data) => setProfile(data.profile))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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
          <Link to="/dashboard" className="text-sm text-accent hover:text-accent-hover hover:underline">
            Back to dashboard
          </Link>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <AboutSection
          about={profile?.about}
          canEdit={Boolean(profile)}
          onSave={handleSaveAbout}
          emptyMessage={
            profile
              ? 'Add an introduction to tell people about yourself.'
              : 'Complete your profile details below before adding an introduction.'
          }
        />

        <ProfileDetails profile={profile} onSave={handleSaveDetails} />

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
