import { Link } from 'react-router-dom'

function personName(profile) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}

function PersonCard({ person, extra, children }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div>
        <Link
          to={`/profile/${person.id}`}
          className="font-semibold text-text hover:text-accent hover:underline"
        >
          {personName(person.profile) || person.email}
        </Link>
        <p className="text-sm text-text-muted">{person.profile.professionalTitle}</p>
        <p className="text-sm text-text-faint">{person.profile.city?.name || 'No city set'}</p>
      </div>

      {extra && <p className="text-sm text-text-faint">{extra}</p>}

      {children && <div>{children}</div>}
    </div>
  )
}

export default PersonCard
