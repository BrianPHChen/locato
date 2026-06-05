import { useEffect, useState } from 'react'
import liff from '@line/liff'
import './App.css'

const LIFF_ID = import.meta.env.VITE_LIFF_ID

export default function App() {
  const [userName, setUserName] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    liff
      .init({ liffId: LIFF_ID })
      .then(() => {
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }
        return liff.getProfile()
      })
      .then((profile) => {
        if (profile) {
          setUserName(profile.displayName)
        }
      })
      .catch((err) => {
        console.error('LIFF init error:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="container">Loading...</div>
  if (error) return <div className="container error">Error: {error}</div>

  return (
    <div className="container">
      <h1>Hello World, {userName ?? 'Guest'}!</h1>
    </div>
  )
}
