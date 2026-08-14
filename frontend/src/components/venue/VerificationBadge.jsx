function VerificationBadge({ status }) {
  const isVerified = status === 'VERIFIED'
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        isVerified ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'
      }`}
    >
      {isVerified ? 'Verified' : 'Unverified'}
    </span>
  )
}

export default VerificationBadge
