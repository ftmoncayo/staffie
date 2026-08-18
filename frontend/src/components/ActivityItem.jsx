import { Link } from 'react-router-dom'
import useEngagement from '../hooks/useEngagement'
import CommentSection from './CommentSection'

function personName(profile) {
  if (!profile) return null
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
}

function formatDate(value) {
  if (!value) return ''
  return value.slice(0, 10)
}

function ActorLink({ user }) {
  if (!user) return <span>Someone</span>
  return (
    <Link to={`/profile/${user.id}`} className="font-medium text-text hover:text-accent hover:underline">
      {personName(user.profile) || user.email}
    </Link>
  )
}

function EntityLink({ entity, to }) {
  if (!entity) return <span>Something</span>
  return (
    <Link to={to} className="font-medium text-text hover:text-accent hover:underline">
      {entity.name}
    </Link>
  )
}

function activityContent(activity) {
  const { type, actor, counterpart, venue, business, notice, job, experience } = activity

  switch (type) {
    case 'SIGNUP': {
      const title = actor?.profile?.professionalTitle
      const cityName = actor?.profile?.city?.name
      return (
        <>
          <ActorLink user={actor} /> joined Staffie
          {title ? ` as a ${title}` : ''}
          {cityName ? ` in ${cityName}` : ''}
        </>
      )
    }
    case 'CONNECTION_MADE':
      return (
        <>
          <ActorLink user={actor} /> connected with <ActorLink user={counterpart} />
        </>
      )
    case 'EXPERIENCE_ADDED':
      return (
        <>
          <ActorLink user={actor} /> added a new role
          {experience?.roleTitle ? `: ${experience.roleTitle}` : ''}
          {venue ? (
            <>
              {' '}
              at <EntityLink entity={venue} to={`/venues/${venue.id}`} />
            </>
          ) : (
            ''
          )}
        </>
      )
    case 'CERTIFICATION_ADDED':
      return (
        <>
          <ActorLink user={actor} /> added a certification
        </>
      )
    case 'PROFILE_UPDATED':
      return (
        <>
          <ActorLink user={actor} /> updated their profile
        </>
      )
    case 'VENUE_CREATED':
      return (
        <>
          <ActorLink user={actor} /> created a new venue
        </>
      )
    case 'BUSINESS_CREATED':
      return (
        <>
          <ActorLink user={actor} /> created a new business
        </>
      )
    case 'NOTICE_POSTED': {
      const target = venue || business
      const to = venue ? `/venues/${venue.id}` : `/businesses/${business?.id}`
      return (
        <>
          <ActorLink user={actor} /> posted a notice for <EntityLink entity={target} to={to} />
          {notice?.content ? <>: {notice.content}</> : ''}
        </>
      )
    }
    case 'JOB_POSTED':
      return (
        <>
          <ActorLink user={actor} /> posted a job at <EntityLink entity={venue} to={`/venues/${venue?.id}`} />
          {job?.title ? (
            <>
              : <EntityLink entity={{ name: job.title }} to={`/jobs/${job.id}`} />
            </>
          ) : (
            ''
          )}
        </>
      )
    default:
      return 'Activity'
  }
}

function ActivityItem({ activity }) {
  // Jobs and connections don't support nodding/commenting at all — hide
  // engagement entirely rather than fetching engagement state that will
  // never be used.
  const hidesEngagement = activity.type === 'JOB_POSTED' || activity.type === 'CONNECTION_MADE'
  const { comments, canEngage, loading, error, content, setContent, submitting, handleSubmit, handleDelete } =
    useEngagement('ACTIVITY', activity.id, { enabled: !hidesEngagement })

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-text">{activityContent(activity)}</p>
        <div className="flex shrink-0 items-center gap-2">
          {activity.favourited && <span className="text-xs text-accent">★ Favourite</span>}
          <span className="text-xs text-text-faint">{formatDate(activity.createdAt)}</span>
        </div>
      </div>

      {!hidesEngagement && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {error && <p className="text-xs text-danger">{error}</p>}
          {!loading && comments.length > 0 && (
            <span className="text-xs text-text-faint">
              {comments.length} comment{comments.length === 1 ? '' : 's'}
            </span>
          )}
          <CommentSection
            loading={loading}
            comments={comments}
            canEngage={canEngage}
            content={content}
            setContent={setContent}
            submitting={submitting}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
          />
        </div>
      )}
    </div>
  )
}

export default ActivityItem
