import { useState, useEffect, useCallback } from 'react'
import liff from '@line/liff'

async function fetchCheckins(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`
  console.log('Fetching feed:', url)
  const res = await fetch(url)
  const text = await res.text()
  const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1])

  const cols = json.table.cols.map((c) => c.label.trim())
  const rows = json.table.rows ?? []

  return rows
    .map((row) => {
      const entry = {}
      row.c.forEach((cell, i) => { entry[cols[i]] = cell?.f ?? cell?.v ?? '' })
      return entry
    })
    .reverse() // newest first
}

export default function CheckinPage({ profile, config, configParam }) {
  const [location, setLocation] = useState('')
  const [manualUserId, setManualUserId] = useState('')
  const [manualUsername, setManualUsername] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [checkins, setCheckins] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState(null)

  const isLoggedIn = !!profile

  const loadFeed = useCallback(async () => {
    if (!config.sheetId) return
    setFeedLoading(true)
    setFeedError(null)
    try {
      const data = await fetchCheckins(config.sheetId)
      setCheckins(data)
    } catch (e) {
      console.error('Feed error:', e)
      setFeedError('無法載入動態，請確認試算表已發佈到網路')
    } finally {
      setFeedLoading(false)
    }
  }, [config.sheetId])

  useEffect(() => { loadFeed() }, [loadFeed])

  function handleLogin() {
    liff.login({ redirectUri: window.location.href })
  }

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
      // Reload feed after a short delay to let Google Sheets update
      setTimeout(() => loadFeed(), 3000)
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

        {isLoggedIn ? (
          <>
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
          <>
            <button
              className="btn-checkin"
              onClick={handleCheckin}
              disabled={!location.trim() || status === 'submitting'}
            >
              {status === 'submitting' ? '打卡中...' : 'Check In'}
            </button>
            <button className="btn-primary" onClick={handleLogin}>
              使用 LINE 登入
            </button>
          </>
        )}
      </div>

      {config.sheetId && (
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="feed-header">
            <h2>打卡動態</h2>
            <button className="btn-refresh" onClick={loadFeed} disabled={feedLoading}>
              {feedLoading ? '載入中...' : '重新整理'}
            </button>
          </div>

          {feedError && <p className="error">{feedError}</p>}

          {!feedLoading && !feedError && checkins.length === 0 && (
            <p className="muted">還沒有人打卡</p>
          )}

          <ul className="feed-list">
            {checkins.map((row, i) => (
              <li key={i} className="feed-item">
                <span className="feed-name">{row['Username'] || '—'}</span>
                <span className="feed-location">{row['Location'] || '—'}</span>
                <span className="feed-time">{row['時間戳記'] || row['Timestamp'] || row['Time'] || ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
