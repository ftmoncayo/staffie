import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../lib/api'

function Home() {
  const [status, setStatus] = useState('loading...')

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
      <h1 className="text-4xl font-semibold text-text">
        Staffie MVP — Hello World
      </h1>
      <p className="text-lg text-text-muted">Backend status: {status}</p>
      <div className="flex gap-4">
        <Link to="/login" className="text-accent hover:text-accent-hover hover:underline">
          Log in
        </Link>
        <Link to="/signup" className="text-accent hover:text-accent-hover hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  )
}

export default Home
