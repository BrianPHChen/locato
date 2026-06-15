import { useEffect, useState } from 'react'
import liff from '@line/liff'
import SetupPage from './SetupPage'
import CheckinPage from './CheckinPage'
import './App.css'

const LIFF_ID = import.meta.env.VITE_LIFF_ID

export default function App() {
  const [profile, setProfile] = useState(null)
  const [liffReady, setLiffReady] = useState(false)

  const params = new URLSearchParams(window.location.search)
  const configParam = params.get('c')

  useEffect(() => {
    liff
      .init({ liffId: LIFF_ID })
      .then(() => {
        if (liff.isLoggedIn()) {
          return liff.getProfile()
        }
        return null
      })
      .then((p) => p && setProfile(p))
      .catch((e) => console.warn('LIFF init failed:', e))
      .finally(() => setLiffReady(true))
  }, [])

  // SetupPage doesn't need LIFF at all — show immediately
  if (!configParam) return <SetupPage />

  // CheckinPage waits for LIFF init to know login state
  if (!liffReady) return <div className="screen-center">載入中...</div>

  let config
  try {
    config = JSON.parse(decodeURIComponent(escape(atob(configParam))))
  } catch {
    return <div className="screen-center error">連結無效，請重新取得</div>
  }

  return <CheckinPage profile={profile} config={config} configParam={configParam} />
}
