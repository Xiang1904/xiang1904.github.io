# 莊凱翔 JavaScript 期末專案

這是一個全端個人作品集、React 學習筆記與簡易記帳專題，符合期末作業需求：

- 個人介紹
- 五週 React 學習內容
- 簡易記帳期末專題
- 前端頁面
- 後端 API
- SQLite 資料庫
- 會員註冊、登入、登出
- 登入後才能留言
- 另開記帳頁面 `/expense.html`
- Firebase Authentication 登入註冊
- Firestore 即時留言資料庫

## 執行方式

```bash
npm start
```

本機開啟：

```text
http://localhost:3000
```

## 專案結構

```text
server.js          後端 Node.js 伺服器、API、會員系統與 SQLite 初始化
data/site.db       SQLite 資料庫，第一次啟動會自動建立
public/index.html  前端頁面
public/styles.css  網站樣式
public/app.js      Firebase Auth、Firestore 留言與前端互動
public/expense.html  簡易記帳頁
public/expense.css   記帳頁樣式
public/expense.js    Firebase 記帳邏輯
```

## 主要功能

使用者可以先用電子信箱註冊 Firebase 帳號。登入成功後，前端才會開放留言表單。留言會寫入 Firestore，並即時顯示留言者帳號與時間。

## 部署建議

目前前端已改用 Firebase Auth 與 Firestore，所以可以部署到 GitHub Pages。請先在 Firebase Console 啟用 Authentication 的 Email/Password 登入方式，並建立 Firestore Database。

Render 設定：

- Build Command: 可留空，或填 `npm install`
- Start Command: `npm start`
- Environment: Node.js 24+
