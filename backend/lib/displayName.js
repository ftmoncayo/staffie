function displayName(user) {
  if (!user) return null
  const name = user.profile
    ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ')
    : ''
  return name || user.email
}

module.exports = { displayName }
