import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL

function App() {
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
    </div>
  )
}

export default App
