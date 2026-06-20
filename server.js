const path = require("path");
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
const databasePath = process.env.DATABASE_PATH || path.join(dataDir, "site.db");
const publicDir = path.join(__dirname, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    intro TEXT NOT NULL,
    school TEXT NOT NULL,
    email TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS course_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    skill TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS final_project (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    features TEXT NOT NULL,
    tech_stack TEXT NOT NULL,
    status TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec("ALTER TABLE messages ADD COLUMN user_id INTEGER REFERENCES users(id)");
} catch {
  // Column already exists.
}

const upsertProfile = db.prepare(`
  INSERT INTO profile (id, name, title, intro, school, email)
  VALUES (1, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    title = excluded.title,
    intro = excluded.intro,
    school = excluded.school,
    email = excluded.email
`);

upsertProfile.run(
  "莊凱翔",
  "React 學習筆記與期末記帳專題",
  "我是南台科技大學的學生。這個網站整理了我五週學習 React 的筆記，並加入會員留言板與登入式記帳專題，讓作品不只是一個靜態自我介紹頁。",
  "南台科技大學",
  "4B2G0065@stust.edu.tw"
);

db.exec("DELETE FROM course_topics");

const insertTopic = db.prepare(`
  INSERT INTO course_topics (week, title, summary, skill)
  VALUES (?, ?, ?, ?)
`);

[
  ["第 1 週", "React 環境與 Vite 建置", "認識 React 的用途，使用 Node.js、npm 與 Vite 建立第一個 React 專案。", "Node.js、npm、Vite"],
  ["第 2 週", "JSX 與 Component", "學習 JSX 語法、元件拆分與 props 傳遞，建立可重複使用的畫面區塊。", "JSX、props、component"],
  ["第 3 週", "State 與事件處理", "使用 useState 管理畫面狀態，並透過 click、input 等事件完成互動功能。", "useState、events"],
  ["第 4 週", "資料渲染與條件顯示", "練習陣列 map 產生列表、條件式渲染，以及表單輸入資料的處理方式。", "map、conditional render、forms"],
  ["第 5 週", "React 專案整理與展示", "整理 React 專案檔案結構，製作個人名片展示頁，並了解如何部署作品。", "project structure、deploy"]
].forEach((topic) => insertTopic.run(...topic));

db.prepare(`
  INSERT INTO final_project (id, name, goal, features, tech_stack, status)
  VALUES (1, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    goal = excluded.goal,
    features = excluded.features,
    tech_stack = excluded.tech_stack,
    status = excluded.status
`).run(
  "簡易記帳 App",
  "製作一個登入後才能使用的簡易記帳頁面，讓使用者可以記錄收入支出、查看統計並管理自己的資料。",
  "Firebase 登入註冊、收支新增刪除、分類篩選、統計摘要、Firestore 雲端儲存",
  "HTML, CSS, JavaScript, Firebase Auth, Firestore",
  "首頁可查看專題說明，點擊按鈕會另外開啟記帳頁面。"
);

const sendJson = (res, status, data, headers = {}) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(JSON.stringify(data));
};

const readJsonBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("資料量太大。"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON 格式錯誤。"));
      }
    });
  });
};

const parseCookies = (header = "") => {
  return Object.fromEntries(
    header
      .split(";")
      .map((item) => item.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
};

const hashPassword = (password, salt) => {
  return crypto.scryptSync(password, salt, 64).toString("hex");
};

const publicUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    created_at: user.created_at
  };
};

const getCurrentUser = (req) => {
  const { session } = parseCookies(req.headers.cookie || "");

  if (!session) return null;

  const row = db.prepare(`
    SELECT users.id, users.username, users.created_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > datetime('now')
  `).get(session);

  return row || null;
};

const createSession = (userId) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);

  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expiresAt);

  return token;
};

const getSiteData = (req) => {
  const profile = db.prepare("SELECT * FROM profile WHERE id = 1").get();
  const topics = db.prepare("SELECT * FROM course_topics ORDER BY id").all();
  const project = db.prepare("SELECT * FROM final_project WHERE id = 1").get();
  const currentUser = publicUser(getCurrentUser(req));
  const messages = db.prepare(`
    SELECT
      messages.id,
      COALESCE(users.username, messages.name) AS name,
      messages.content,
      messages.created_at
    FROM messages
    LEFT JOIN users ON users.id = messages.user_id
    ORDER BY messages.id DESC
    LIMIT 8
  `).all();

  return { profile, topics, project, currentUser, messages };
};

const registerUser = (body) => {
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return { status: 400, data: { error: "帳號需為 3-20 個英數字或底線。" } };
  }

  if (password.length < 6 || password.length > 40) {
    return { status: 400, data: { error: "密碼需為 6-40 個字。" } };
  }

  const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(username);

  if (exists) {
    return { status: 409, data: { error: "此帳號已被註冊。" } };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, salt)
    VALUES (?, ?, ?)
  `).run(username, passwordHash, salt);

  const token = createSession(Number(result.lastInsertRowid));
  const user = db.prepare("SELECT id, username, created_at FROM users WHERE id = ?")
    .get(Number(result.lastInsertRowid));

  return {
    status: 201,
    data: { user: publicUser(user) },
    token
  };
};

const loginUser = (body) => {
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (!user || hashPassword(password, user.salt) !== user.password_hash) {
    return { status: 401, data: { error: "帳號或密碼錯誤。" } };
  }

  const token = createSession(user.id);

  return {
    status: 200,
    data: { user: publicUser(user) },
    token
  };
};

const createMessage = (req, body) => {
  const user = getCurrentUser(req);
  const content = String(body.content || "").trim();

  if (!user) {
    return { status: 401, data: { error: "請先登入帳號，才能留言。" } };
  }

  if (content.length < 1) {
    return { status: 400, data: { error: "請輸入留言內容。" } };
  }

  if (content.length > 180) {
    return { status: 400, data: { error: "留言太長，請縮短後再送出。" } };
  }

  const result = db.prepare(`
    INSERT INTO messages (name, content, user_id)
    VALUES (?, ?, ?)
  `).run(user.username, content, user.id);

  const message = db.prepare(`
    SELECT
      messages.id,
      users.username AS name,
      messages.content,
      messages.created_at
    FROM messages
    JOIN users ON users.id = messages.user_id
    WHERE messages.id = ?
  `).get(Number(result.lastInsertRowid));

  return { status: 201, data: message };
};

const clearSession = (req) => {
  const { session } = parseCookies(req.headers.cookie || "");

  if (session) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(session);
  }
};

const sessionCookie = (token) => {
  return `session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`;
};

const clearCookie = "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";

const sendStaticFile = (res, requestPath) => {
  const cleanPath = requestPath === "/" ? "/index.html" : requestPath;
  const requestedFile = path.normalize(decodeURIComponent(cleanPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, requestedFile);
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(path.resolve(publicDir))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const finalPath = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()
    ? resolvedPath
    : path.join(publicDir, "index.html");

  const extension = path.extname(finalPath).toLowerCase();
  res.writeHead(200, { "Content-Type": mimeTypes[extension] || "application/octet-stream" });
  fs.createReadStream(finalPath).pipe(res);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/site") {
      sendJson(res, 200, getSiteData(req));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/me") {
      sendJson(res, 200, { user: publicUser(getCurrentUser(req)) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/register") {
      const result = registerUser(await readJsonBody(req));
      const headers = result.token ? { "Set-Cookie": sessionCookie(result.token) } : {};
      sendJson(res, result.status, result.data, headers);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      const result = loginUser(await readJsonBody(req));
      const headers = result.token ? { "Set-Cookie": sessionCookie(result.token) } : {};
      sendJson(res, result.status, result.data, headers);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      clearSession(req);
      sendJson(res, 200, { ok: true }, { "Set-Cookie": clearCookie });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/messages") {
      const result = createMessage(req, await readJsonBody(req));
      sendJson(res, result.status, result.data);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(res, 404, { error: "找不到 API。" });
      return;
    }

    sendStaticFile(res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "伺服器錯誤。" });
  }
});

server.listen(port, () => {
  console.log(`Final project site is running on http://localhost:${port}`);
});
