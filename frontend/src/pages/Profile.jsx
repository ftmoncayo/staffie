import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../lib/api'
import ProfileDetails from '../components/profile/ProfileDetails'
import SkillsEditor from '../components/profile/SkillsEditor'
import KnowledgeAreaEditor from '../components/profile/KnowledgeAreaEditor'
import ExperienceEditor from '../components/profile/ExperienceEditor'
import CertificationsEditor from '../components/profile/CertificationsEditor'

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

  if (loading) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Your profile</h1>
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
            Back to dashboard
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

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
      </div>
    </div>
  )
}

export default Profile
