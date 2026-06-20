const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const dbPath = path.join(__dirname, "..", "data", "site.db");

if (!fs.existsSync(dbPath)) {
  console.error("資料庫檔案不存在：", dbPath);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
const op = process.argv[2] || "both";

try {
  if (op === "messages") {
    db.exec("DELETE FROM messages;");
    console.log("已刪除 messages 表的所有資料。");
  } else if (op === "users") {
    db.exec("DELETE FROM sessions; DELETE FROM users;");
    console.log("已刪除 sessions 與 users 表的所有資料。");
  } else if (op === "both" || op === "all") {
    db.exec("BEGIN TRANSACTION; DELETE FROM messages; DELETE FROM sessions; DELETE FROM users; COMMIT;");
    console.log("已刪除 messages、sessions 與 users 的所有資料。");
  } else {
    console.log("用法：node scripts/clear-db.js messages|users|both");
  }
  process.exit(0);
} catch (err) {
  console.error("執行時發生錯誤：", err && err.message ? err.message : err);
  process.exit(1);
}
