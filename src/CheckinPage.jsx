import { useState } from 'react'
import liff from '@line/liff'

export default function CheckinPage({ profile, config, configParam }) {
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error

  const isLoggedIn = !!profile

  function handleLogin() {
    liff.login({ redirectUri: window.location.href })
  }

  async function handleCheckin() {
    if (!location.trim()) return
    setStatus('submitting')

    const now = new Date().toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })

    const formData = new FormData()
    formData.append(config.entryUserId, profile.userId)
    formData.append(config.entryUsername, profile.displayName)
    formData.append(config.entryTime, now)
    formData.append(config.entryLocation, location.trim())

    try {
      await fetch(config.actionUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
      })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  async function handleShare() {
    const base = `${window.location.origin}${window.location.pathname}`
    const url = `${base}?c=${configParam}`
    try {
      await liff.shareTargetPicker([
        { type: 'text', text: `📍 ${config.eventName || 'Check In'}\n快來打卡！\n${url}` },
      ])
    } catch (e) {
      console.error('share error', e)
    }
  }

  if (status === 'success') {
    return (
      <div className="page">
        <div className="card center">
          <div className="success-icon">✓</div>
          <h2>打卡成功！</h2>
          <p className="muted">已記錄你在「{location}」的打卡</p>
          <button className="btn-secondary" style={{ marginTop: '24px' }} onClick={() => setStatus('idle')}>
            再打一次
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        {config.eventName && <p className="event-name">{config.eventName}</p>}
        <h1>{isLoggedIn ? `Hi, ${profile.displayName}` : '打卡活動'}</h1>

        {isLoggedIn ? (
          <>
            <div className="field">
              <label>你在哪裡？</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：台北辦公室、B1 會議室"
                disabled={status === 'submitting'}
              />
            </div>

            {status === 'error' && (
              <p className="error">送出失敗，請確認網路連線後再試</p>
            )}

            <button
              className="btn-checkin"
              onClick={handleCheckin}
              disabled={!location.trim() || status === 'submitting'}
            >
              {status === 'submitting' ? '打卡中...' : 'Check In'}
            </button>

            <button className="btn-share" onClick={handleShare}>
              分享打卡連結給朋友
            </button>
          </>
        ) : (
          <button className="btn-primary" onClick={handleLogin}>
            使用 LINE 登入以打卡
          </button>
        )}
      </div>
    </div>
  )
}
