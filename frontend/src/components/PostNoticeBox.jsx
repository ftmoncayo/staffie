import { useState } from 'react'

function PostNoticeBox({ onSubmit, onPosted }) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent('')
      onPosted?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
      <h2 className="text-xl font-semibold text-text">Post a notice</h2>
      {error && <p className="text-sm text-danger">{error}</p>}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share an update with everyone who follows or works here..."
        rows={3}
        className="rounded border border-border-strong bg-bg px-3 py-2 text-text focus:border-accent"
      />
      <button
        type="submit"
        disabled={submitting || !content.trim()}
        className="self-start rounded bg-accent px-4 py-2 text-sm font-medium text-accent-text hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting ? 'Posting...' : 'Post notice'}
      </button>
    </form>
  )
}

export default PostNoticeBox
