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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <h1 className="text-4xl font-semibold text-gray-900">
        Staffie MVP — Hello World
      </h1>
      <p className="text-lg text-gray-600">Backend status: {status}</p>
      <div className="flex gap-4">
        <Link to="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
        <Link to="/signup" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  )
}

export default Home
