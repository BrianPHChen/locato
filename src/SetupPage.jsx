import { useState, useEffect } from 'react'
import liff from '@line/liff'

const FIELD_ORDER = ['User ID', 'Username', 'Timestamp', 'Location']
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzY3fhrm3RjqDxaiqSrTLfWVvihpoE0agDALJXYJ4suRN469mOXQMNuTu1WMe5mmkaSgw/exec'

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
  const match = url.match(/\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9-_]{10,})/)
  return match?.[1] ?? null
}

export default function SetupPage() {
  const [prefillUrl, setPrefillUrl] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')
  const [eventName, setEventName] = useState('')
  const [parseError, setParseError] = useState('')
  const [parsed, setParsed] = useState(null)
  const [autoEditUrl, setAutoEditUrl] = useState(null)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [showManual, setShowManual] = useState(false)

  // Read auto-fill params returned from Apps Script
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const actionUrl = params.get('autoActionUrl')
    if (actionUrl) {
      setParsed({
        actionUrl,
        entries: [
          params.get('autoEntryUserId'),
          params.get('autoEntryUsername'),
          params.get('autoEntryTime'),
          params.get('autoEntryLocation'),
        ],
      })
      setAutoEditUrl(params.get('autoEditUrl'))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  function handleAutoCreate() {
    const callback = `${window.location.origin}${window.location.pathname}`
    window.location.href = `${APPS_SCRIPT_URL}?callback=${encodeURIComponent(callback)}`
  }

  function handleParse() {
    setParseError('')
    setParsed(null)
    setAutoEditUrl(null)
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
    console.log('Extracted sheetId:', sheetId)
    const config = {
      actionUrl: parsed.actionUrl,
      entryUserId: parsed.entries[0],
      entryUsername: parsed.entries[1],
      entryTime: parsed.entries[2],
      entryLocation: parsed.entries[3],
      eventName: eventName.trim(),
      ...(sheetId && { sheetId }),
    }
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(config))))
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

        {!parsed ? (
          <>
            <button className="btn-primary" onClick={handleAutoCreate}>
              自動建立 Google Form
            </button>
            <p className="field-hint" style={{ textAlign: 'center', marginTop: '8px' }}>
              會跳到 Google 授權頁面，授權後自動建好表單並返回
            </p>

            <div className="divider">或</div>

            <button className="btn-secondary" onClick={() => setShowManual(v => !v)}>
              {showManual ? '收起手動設定' : '手動設定'}
            </button>

            {showManual && (
              <div style={{ marginTop: '16px' }}>
                <section className="instructions">
                  <h2>手動步驟</h2>
                  <ol>
                    <li>
                      建立 Google 表單，新增 4 個<strong>「簡答」</strong>欄位：
                      <ul>
                        {FIELD_ORDER.map((f) => <li key={f}><code>{f}</code></li>)}
                      </ul>
                    </li>
                    <li>發佈表單，確認已開啟<strong>接受回覆</strong></li>
                    <li>右上角 <strong>⋮ → 取得預先填入的連結</strong>，每個欄位填任意值後複製連結</li>
                    <li>貼到下方</li>
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
              </div>
            )}
          </>
        ) : (
          <div className="parsed-result">
            <p className="success">表單設定完成</p>

            {autoEditUrl && (
              <div className="info-box">
                <p>表單已建立在你的 Google Drive</p>
                <a href={autoEditUrl} target="_blank" rel="noreferrer">開啟表單編輯頁面</a>
                <p className="field-hint" style={{ marginTop: '6px' }}>
                  請到表單連結的 Google Sheet → Share → Anyone with link can view，才能顯示打卡動態
                </p>
              </div>
            )}

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
              <p className="field-hint">貼一般的編輯 URL，並將 Sheet 共享設為「任何人可檢視」</p>
            </div>

            <button className="btn-primary" onClick={handleGenerate}>
              產生分享連結
            </button>

            <button className="btn-secondary" style={{ marginTop: '8px' }} onClick={() => { setParsed(null); setAutoEditUrl(null); setShareUrl('') }}>
              重新設定
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
