import { useEffect, useState } from 'react'
import * as api from '../lib/api'

// Shared nod/comment data + actions for a POST or ACTIVITY target. Pass
// enabled: false to skip fetching entirely (e.g. targets that never support
// engagement) — canEngage then stays at its unused default and nothing is
// rendered by the caller.
function useEngagement(targetType, targetId, { enabled = true } = {}) {
  const [comments, setComments] = useState([])
  const [nodCount, setNodCount] = useState(0)
  const [nodded, setNodded] = useState(false)
  const [canEngage, setCanEngage] = useState(true)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nodding, setNodding] = useState(false)

  function refresh() {
    return api.fetchEngagement(targetType, targetId).then((data) => {
      setComments(data.comments)
      setNodCount(data.nodCount)
      setNodded(data.nodded)
      setCanEngage(data.canEngage !== false)
    })
  }

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId, enabled])

  async function handleNod() {
    setError('')
    setNodding(true)
    try {
      const result = await api.toggleNod(targetType, targetId)
      setNodded(result.nodded)
      setNodCount(result.nodCount)
    } catch (err) {
      setError(err.message)
    } finally {
      setNodding(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setError('')
    setSubmitting(true)
    try {
      await api.createComment(targetType, targetId, content.trim())
      setContent('')
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    setError('')
    try {
      await api.deleteComment(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return {
    comments,
    nodCount,
    nodded,
    canEngage,
    loading,
    error,
    content,
    setContent,
    submitting,
    nodding,
    handleNod,
    handleSubmit,
    handleDelete,
  }
}

export default useEngagement
