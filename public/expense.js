import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvOg8FfizDFd7CFR1qO9jz6L64dJ-nHmE",
  authDomain: "xiang-da38c.firebaseapp.com",
  projectId: "xiang-da38c",
  storageBucket: "xiang-da38c.firebasestorage.app",
  messagingSenderId: "777806151902",
  appId: "1:777806151902:web:0639695efb55137bb0424f",
  measurementId: "G-365NVJC4GR"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

isSupported().then((supported) => {
  if (supported) getAnalytics(firebaseApp);
});

const TYPE_LABELS = {
  income: "收入",
  expense: "支出"
};

const CATEGORY_LABELS = {
  salary: "薪資",
  food: "飲食",
  transport: "交通",
  shopping: "購物",
  entertainment: "娛樂",
  other: "其他"
};

const state = {
  authMode: "login",
  currentUser: null,
  expenses: [],
  filter: "all",
  unsubscribeExpenses: null
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(value || 0);
};

const formatDate = (value) => {
  const date = value?.toDate ? value.toDate() : new Date(value || Date.now());

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
};

const escapeHtml = (value) => {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const normalizeAccount = (value) => {
  return String(value || "").trim().toLowerCase();
};

const accountToFirebaseEmail = (account) => {
  const value = normalizeAccount(account);

  if (value.includes("@")) return value;

  if (!/^[a-z0-9_]{3,30}$/.test(value)) {
    throw new Error("帳號需為 3-30 個英數字或底線。");
  }

  return `${value}@xiang.local`;
};

const readableFirebaseError = (error) => {
  const code = error?.code || "";

  if (code === "auth/configuration-not-found") {
    return "Firebase 尚未啟用 Email/Password 登入。";
  }

  if (code === "auth/email-already-in-use") return "這個帳號已經被註冊。";
  if (code === "auth/invalid-credential") return "帳號或密碼錯誤。";
  if (code === "auth/weak-password") return "密碼至少需要 6 個字。";
  if (code === "auth/invalid-email") return "帳號格式不正確，請使用英數字或底線。";
  if (code === "auth/operation-not-allowed") return "Firebase 尚未開啟 Email/Password 登入方式。";

  return error?.message || "Firebase 操作失敗。";
};

const setStatus = (elementId, message, isError = false) => {
  const element = document.getElementById(elementId);
  element.textContent = message || "";
  element.style.color = isError ? "#ff8787" : "var(--muted)";
};

const setAuthMode = (mode) => {
  state.authMode = mode;
  document.getElementById("login-tab").classList.toggle("active", mode === "login");
  document.getElementById("register-tab").classList.toggle("active", mode === "register");
  document.getElementById("auth-submit").textContent = mode === "login" ? "登入" : "註冊";
  setStatus("auth-status", mode === "login" ? "輸入帳號與密碼登入。" : "建立一組新的帳號與密碼。", false);
};

const renderAuth = () => {
  const isLoggedIn = Boolean(state.currentUser);
  const authForm = document.getElementById("auth-form");
  const userPanel = document.getElementById("user-panel");
  const expenseForm = document.getElementById("expense-form");
  const expenseInputIds = ["expense-date", "expense-type", "expense-category", "expense-amount", "expense-note"];

  authForm.classList.toggle("hidden", isLoggedIn);
  userPanel.classList.toggle("hidden", !isLoggedIn);
  expenseForm.classList.toggle("locked", !isLoggedIn);

  expenseInputIds.forEach((id) => {
    document.getElementById(id).disabled = !isLoggedIn;
  });

  document.getElementById("current-user").textContent = isLoggedIn ? state.currentUser.email : "";
  setStatus("expense-status", isLoggedIn ? "可以開始新增記帳資料。" : "請先登入帳號才能新增記帳資料。", !isLoggedIn);
};

const renderExpenses = () => {
  const list = document.getElementById("expense-list");
  const currentUid = state.currentUser?.uid || "";

  if (!currentUid) {
    list.innerHTML = '<p class="empty-message">登入後就可以開始新增記錄。</p>';
    return;
  }

  let entries = state.expenses.slice();

  if (state.filter === "income") {
    entries = entries.filter((item) => item.type === "income");
  } else if (state.filter === "expense") {
    entries = entries.filter((item) => item.type === "expense");
  }

  if (!entries.length) {
    list.innerHTML = '<p class="empty-message">目前沒有相符的記帳紀錄。</p>';
    return;
  }

  entries.sort((left, right) => {
    const leftDate = new Date(left.date || 0).getTime();
    const rightDate = new Date(right.date || 0).getTime();
    return rightDate - leftDate;
  });

  list.innerHTML = entries
    .map((entry) => {
      const amountClass = entry.type === "income" ? "income" : "expense";
      const amountPrefix = entry.type === "income" ? "+" : "-";

      return `
        <article class="expense-item" data-id="${escapeHtml(entry.id)}">
          <div class="expense-item-content">
            <div class="expense-item-header">
              <span class="badge ${entry.type}">${TYPE_LABELS[entry.type]}</span>
              <span class="badge ${entry.category}">${CATEGORY_LABELS[entry.category]}</span>
            </div>
            <div class="expense-item-note">${escapeHtml(entry.note || CATEGORY_LABELS[entry.category])}</div>
            <div class="expense-item-date">${escapeHtml(formatDate(entry.date))}</div>
          </div>
          <div class="expense-item-amount ${amountClass}">${amountPrefix}${formatCurrency(entry.amount)}</div>
          <button class="delete-btn" type="button" data-action="delete" data-id="${escapeHtml(entry.id)}">刪除</button>
        </article>
      `;
    })
    .join("");
};

const updateSummary = () => {
  const income = state.expenses.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const expense = state.expenses.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  document.getElementById("summary-income").textContent = formatCurrency(income);
  document.getElementById("summary-expense").textContent = formatCurrency(expense);
  document.getElementById("summary-balance").textContent = formatCurrency(income - expense);
};

const subscribeExpenses = (uid) => {
  if (state.unsubscribeExpenses) {
    state.unsubscribeExpenses();
    state.unsubscribeExpenses = null;
  }

  const expenseQuery = query(collection(db, "expenses"), where("uid", "==", uid));

  state.unsubscribeExpenses = onSnapshot(expenseQuery, (snapshot) => {
    state.expenses = snapshot.docs.map((expenseDoc) => ({
      id: expenseDoc.id,
      ...expenseDoc.data()
    }));
    renderExpenses();
    updateSummary();
  });
};

const handleAuthSubmit = async (event) => {
  event.preventDefault();

  const username = normalizeAccount(document.getElementById("auth-username").value);
  const password = document.getElementById("auth-password").value;

  if (!username || !password) {
    setStatus("auth-status", "請填寫帳號與密碼。", true);
    return;
  }

  try {
    const email = accountToFirebaseEmail(username);

    if (state.authMode === "register") {
      await createUserWithEmailAndPassword(auth, email, password);
      setStatus("auth-status", "註冊成功，已自動登入。", false);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      setStatus("auth-status", "登入成功。", false);
    }
  } catch (error) {
    setStatus("auth-status", readableFirebaseError(error), true);
  }
};

const handleExpenseSubmit = async (event) => {
  event.preventDefault();

  if (!state.currentUser) {
    setStatus("expense-status", "請先登入帳號才能新增記帳資料。", true);
    return;
  }

  const date = document.getElementById("expense-date").value;
  const type = document.getElementById("expense-type").value;
  const category = document.getElementById("expense-category").value;
  const amount = Number(document.getElementById("expense-amount").value);
  const note = document.getElementById("expense-note").value.trim();

  if (!date || !type || !category || !amount || amount <= 0) {
    setStatus("expense-status", "請填寫完整的記帳資料。", true);
    return;
  }

  try {
    await addDoc(collection(db, "expenses"), {
      uid: state.currentUser.uid,
      account: state.currentUser.email,
      type,
      category,
      amount,
      note,
      date,
      createdAt: serverTimestamp()
    });

    document.getElementById("expense-form").reset();
    document.getElementById("expense-date").value = new Date().toISOString().split("T")[0];
    setStatus("expense-status", "記錄已新增。", false);
  } catch (error) {
    setStatus("expense-status", readableFirebaseError(error), true);
  }
};

const handleListClick = async (event) => {
  const button = event.target.closest("button[data-action='delete']");
  if (!button) return;

  const id = button.dataset.id;

  if (!confirm("確定要刪除這筆記錄嗎？")) return;

  try {
    await deleteDoc(doc(db, "expenses", id));
  } catch (error) {
    setStatus("expense-status", readableFirebaseError(error), true);
  }
};

const setTodayDate = () => {
  document.getElementById("expense-date").value = new Date().toISOString().split("T")[0];
};

const setupEventListeners = () => {
  document.getElementById("login-tab").addEventListener("click", () => setAuthMode("login"));
  document.getElementById("register-tab").addEventListener("click", () => setAuthMode("register"));
  document.getElementById("auth-form").addEventListener("submit", handleAuthSubmit);
  document.getElementById("expense-form").addEventListener("submit", handleExpenseSubmit);
  document.getElementById("logout-button").addEventListener("click", () => signOut(auth));

  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      document.querySelectorAll(".filter-btn").forEach((item) => item.classList.remove("active"));
      event.currentTarget.classList.add("active");
      state.filter = event.currentTarget.dataset.filter;
      renderExpenses();
    });
  });

  document.getElementById("expense-list").addEventListener("click", handleListClick);
};

const init = () => {
  setTodayDate();
  setAuthMode("login");
  setupEventListeners();
  renderAuth();
  updateSummary();

  onAuthStateChanged(auth, (user) => {
    state.currentUser = user;
    renderAuth();

    if (user) {
      subscribeExpenses(user.uid);
    } else {
      if (state.unsubscribeExpenses) {
        state.unsubscribeExpenses();
        state.unsubscribeExpenses = null;
      }
      state.expenses = [];
      renderExpenses();
      updateSummary();
    }
  });
};

document.addEventListener("DOMContentLoaded", init);