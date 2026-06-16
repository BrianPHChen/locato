# Locato

朋友間的即時打卡 app，透過 LINE LIFF 運行，資料存在 Google Forms / Sheets，不需要後端。

## Demo

[https://BrianPHChen.github.io/locato/](https://BrianPHChen.github.io/locato/)

## 功能

- 一鍵自動建立 Google Form + Sheet（透過 Google Apps Script）
- 產生可分享的打卡連結（設定編碼在 URL 中，無需後端儲存）
- 打卡：輸入地點後送出，資料寫入 Google Sheet
- 打卡動態：即時顯示朋友的打卡紀錄
- 透過 LINE 分享連結給朋友
- 未登入可查看動態，登入後才能打卡

## 技術架構

```
LINE LIFF（前端）→ Google Form（收資料）→ Google Sheet（資料庫）
                                              ↑
                                         App 讀取顯示動態
```

- **前端**：React + Vite，部署於 GitHub Pages
- **打卡提交**：iframe POST 到 Google Form `formResponse` endpoint
- **動態讀取**：Google Sheets `gviz/tq` endpoint（需 Sheet 設為任何人可檢視）
- **Form 自動建立**：Google Apps Script Web App
- **身份驗證**：LINE LIFF SDK

## 使用流程

### Organizer（建立打卡連結）

1. 打開 app → 點「自動建立 Google Form」
2. 通過 Google 授權，Form + Sheet 自動建好
3. 填入活動名稱 → 點「產生分享連結」
4. 複製連結或直接分享到 LINE

### Friend（打卡）

1. 點收到的連結，在 LINE 內開啟
2. 使用 LINE 登入
3. 輸入地點 → Check In

## 開發

```bash
npm install
cp .env.example .env   # 填入 VITE_LIFF_ID
npm run dev
```

## 部署

```bash
npm run deploy   # build + push 到 gh-pages branch
```

## 環境變數

| 變數 | 說明 |
|------|------|
| `VITE_LIFF_ID` | LINE LIFF App ID |

## Apps Script

`/locato/` 首頁的「自動建立 Google Form」功能依賴一個 Google Apps Script Web App。
詳見 `apps-script/Code.gs`（或直接在 script.google.com 部署）。

部署設定：
- 執行身分：**存取網路應用程式的使用者**
- 誰可以存取：**所有人**
