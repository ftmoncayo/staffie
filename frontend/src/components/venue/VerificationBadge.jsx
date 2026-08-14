function VerificationBadge({ status }) {
  const isVerified = status === 'VERIFIED'
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
        isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      }`}
    >
      {isVerified ? 'Verified' : 'Unverified'}
    </span>
  )
}

export default VerificationBadge
