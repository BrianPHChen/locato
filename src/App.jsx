import { useEffect, useState } from 'react'
import liff from '@line/liff'
import SetupPage from './SetupPage'
import CheckinPage from './CheckinPage'
import './App.css'

const LIFF_ID = import.meta.env.VITE_LIFF_ID

export default function App() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    liff
      .init({ liffId: LIFF_ID })
      .then(() => {
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }
        return liff.getProfile()
      })
      .then((p) => p && setProfile(p))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="screen-center">載入中...</div>
  if (error) return <div className="screen-center error">{error}</div>

  const params = new URLSearchParams(window.location.search)
  const configParam = params.get('c')

  if (configParam) {
    let config
    try {
      config = JSON.parse(atob(configParam))
    } catch {
      return <div className="screen-center error">連結無效，請重新取得</div>
    }
    return <CheckinPage profile={profile} config={config} configParam={configParam} />
  }

  return <SetupPage />
}
