import { useState } from 'react'
import liff from '@line/liff'

const FIELD_ORDER = ['User ID', 'Username', 'Timestamp', 'Location']

function parsePrefillUrl(rawUrl) {
  try {
    const url = new URL(rawUrl.trim())
    if (!url.hostname.includes('google.com')) {
      return { error: '請貼上 Google Form 的連結' }
    }
    const actionUrl = rawUrl.trim().split('?')[0].replace('/viewform', '/formResponse')
    const entries = []
    for (const key of url.searchParams.keys()) {
      if (key.startsWith('entry.')) entries.push(key)
    }
    if (entries.length < 4) {
      return { error: `只偵測到 ${entries.length} 個欄位，需要 4 個。請確認 Form 有 4 個欄位並填入預填值後再複製連結。` }
    }
    return { actionUrl, entries }
  } catch {
    return { error: '無效的 URL 格式' }
  }
}

function extractSheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] ?? null
}

export default function SetupPage() {
  const [prefillUrl, setPrefillUrl] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [eventName, setEventName] = useState('')
  const [parseError, setParseError] = useState('')
  const [parsed, setParsed] = useState(null)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  function handleParse() {
    setParseError('')
    setParsed(null)
    setShareUrl('')
    const result = parsePrefillUrl(prefillUrl)
    if (result.error) {
      setParseError(result.error)
      return
    }
    setParsed(result)
  }

  function handleGenerate() {
    if (!parsed) return
    const sheetId = sheetUrl.trim() ? extractSheetId(sheetUrl.trim()) : null
    const config = {
      actionUrl: parsed.actionUrl,
      entryUserId: parsed.entries[0],
      entryUsername: parsed.entries[1],
      entryTime: parsed.entries[2],
      entryLocation: parsed.entries[3],
      eventName: eventName.trim(),
      ...(sheetId && { sheetId }),
    }
    const encoded = btoa(JSON.stringify(config))
    const base = `${window.location.origin}${window.location.pathname}`
    setShareUrl(`${base}?c=${encoded}`)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    try {
      await liff.shareTargetPicker([
        {
          type: 'text',
          text: `📍 ${eventName || 'Check In'}\n快來打卡！\n${shareUrl}`,
        },
      ])
    } catch (e) {
      console.error('share error', e)
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>建立打卡連結</h1>

        <section className="instructions">
          <h2>步驟說明</h2>
          <ol>
            <li>
              開啟 <strong>Google 表單</strong>，新增 4 個欄位，類型全選<strong>「簡答」</strong>，依序命名：
              <ul>
                {FIELD_ORDER.map((f) => <li key={f}><code>{f}</code></li>)}
              </ul>
              （注意：Timestamp 也要選簡答，不能選時間類型）
            </li>
            <li>發佈表單，確認已開啟<strong>接受回覆</strong></li>
            <li>在編輯頁面右上角點 <strong>⋮（三個點）</strong>，選「<strong>取得預先填入的連結</strong>」</li>
            <li>每個欄位隨便填入一個值，點「取得連結」後複製該連結</li>
            <li>將連結貼到下方</li>
          </ol>
        </section>

        <div className="field">
          <label>貼上預填連結</label>
          <textarea
            rows={3}
            value={prefillUrl}
            onChange={(e) => setPrefillUrl(e.target.value)}
            placeholder="https://docs.google.com/forms/d/.../viewform?entry.xxx=..."
          />
          <button className="btn-secondary" onClick={handleParse}>解析欄位</button>
        </div>

        {parseError && <p className="error">{parseError}</p>}

        {parsed && (
          <div className="parsed-result">
            <p className="success">成功偵測到 {parsed.entries.length} 個欄位</p>
            {FIELD_ORDER.map((label, i) => (
              <div key={label} className="entry-row">
                <span className="entry-label">{label}</span>
                <code>{parsed.entries[i]}</code>
              </div>
            ))}

            <div className="field" style={{ marginTop: '16px' }}>
              <label>活動名稱（選填）</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="例如：工程師聚會 2026"
              />
            </div>

            <div className="field">
              <label>Google Sheet URL（選填，用於顯示打卡動態）</label>
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="field-hint">需先將試算表「發佈到網路」才能讀取資料</p>
            </div>

            <button className="btn-primary" onClick={handleGenerate}>
              產生分享連結
            </button>
          </div>
        )}

        {shareUrl && (
          <div className="share-box">
            <label>分享連結</label>
            <div className="share-url">{shareUrl}</div>
            <div className="share-actions">
              <button className="btn-secondary" onClick={handleCopy}>
                {copied ? '已複製！' : '複製連結'}
              </button>
              <button className="btn-line" onClick={handleShare}>
                分享到 LINE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
