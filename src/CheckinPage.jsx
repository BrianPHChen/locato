import { useState } from 'react'
import liff from '@line/liff'

export default function CheckinPage({ profile, config, configParam }) {
  const [location, setLocation] = useState('')
  const [manualUserId, setManualUserId] = useState('')
  const [manualUsername, setManualUsername] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error

  const isLoggedIn = !!profile

  function submitViaIframe(actionUrl, fields) {
    const iframe = document.createElement('iframe')
    iframe.name = 'form-target'
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const form = document.createElement('form')
    form.action = actionUrl
    form.method = 'POST'
    form.target = 'form-target'

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()

    setTimeout(() => {
      document.body.removeChild(form)
      document.body.removeChild(iframe)
    }, 3000)
  }

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

    const fields = {
      [config.entryUserId]: profile?.userId ?? manualUserId,
      [config.entryUsername]: profile?.displayName ?? manualUsername,
      [config.entryTime]: now,
      [config.entryLocation]: location.trim(),
      fvv: '1',
      pageHistory: '0',
    }

    console.log('Submitting to:', config.actionUrl, fields)

    try {
      submitViaIframe(config.actionUrl, fields)
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

        {!isLoggedIn && (
          <>
            <div className="field">
              <label>User ID（測試用）</label>
              <input
                type="text"
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
                placeholder="任意填入"
              />
            </div>
            <div className="field">
              <label>Username（測試用）</label>
              <input
                type="text"
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value)}
                placeholder="任意填入"
              />
            </div>
          </>
        )}

        <div className="field">
          <label>Location</label>
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

        {isLoggedIn && (
          <button className="btn-share" onClick={handleShare}>
            分享打卡連結給朋友
          </button>
        )}
      </div>
    </div>
  )
}
