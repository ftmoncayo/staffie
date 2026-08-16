export function displayName(user) {
  if (!user) return ''
  const name = user.profile
    ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ')
    : ''
  return name || user.email
}
