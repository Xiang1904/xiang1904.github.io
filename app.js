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
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
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

const siteData = {
  profile: {
    name: "莊凱翔",
    title: "React 學習筆記與期末遊戲專題",
    intro: "我是南台科技大學的學生。這個網站整理了我五週學習 React 的筆記，並加入會員留言板與小鳥飛水管遊戲專題，讓作品不只是一個靜態自我介紹頁。",
    school: "南台科技大學",
    email: "4B2G0065@stust.edu.tw"
  },
  topics: [
    {
      week: "第 1 週",
      title: "React 環境與 Vite 建置",
      summary: "認識 React 的用途，使用 Node.js、npm 與 Vite 建立第一個 React 專案。",
      skill: "Node.js、npm、Vite"
    },
    {
      week: "第 2 週",
      title: "JSX 與 Component",
      summary: "學習 JSX 語法、元件拆分與 props 傳遞，建立可重複使用的畫面區塊。",
      skill: "JSX、props、component"
    },
    {
      week: "第 3 週",
      title: "State 與事件處理",
      summary: "使用 useState 管理畫面狀態，並透過 click、input 等事件完成互動功能。",
      skill: "useState、events"
    },
    {
      week: "第 4 週",
      title: "資料渲染與條件顯示",
      summary: "練習陣列 map 產生列表、條件式渲染，以及表單輸入資料的處理方式。",
      skill: "map、conditional render、forms"
    },
    {
      week: "第 5 週",
      title: "React 專案整理與展示",
      summary: "整理 React 專案檔案結構，製作個人名片展示頁，並了解如何部署作品。",
      skill: "project structure、deploy"
    }
  ],
  project: {
    name: "小鳥飛水管遊戲",
    goal: "製作一個像 Flappy Bird 的網頁小遊戲，玩家點擊或按空白鍵讓角色飛起，閃避水管並累積分數。",
    features: "Canvas 遊戲畫面、碰撞判定、分數計算、重新挑戰、Firebase 會員留言板",
    tech_stack: "HTML, CSS, JavaScript Canvas, Firebase Auth, Firestore",
    status: "可部署到 GitHub Pages，留言與會員資料會寫入 Firebase。"
  },
  messages: [],
  currentUser: null
};

const state = {
  site: siteData,
  authMode: "login",
  currentUser: null,
  messageLimit: 10,
  unsubscribeMessages: null,
  isLoadingMoreMessages: false,
  hasMoreMessages: true
};

const formatDate = (value) => {
  const date = value?.toDate ? value.toDate() : new Date(value || Date.now());

  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

const formatRelativeTime = (value) => {
  const date = value?.toDate ? value.toDate() : new Date(value || Date.now());
  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) return "剛剛";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小時前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;

  return formatDate(date);
};

const text = (id, value) => {
  document.getElementById(id).textContent = value || "";
};

const escapeHtml = (value) => {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const getDisplayName = (user) => {
  return user?.email ? user.email.split("@")[0] : "";
};

const normalizeUsername = (value) => {
  return String(value || "").trim().toLowerCase();
};

const accountToFirebaseEmail = (account) => {
  const value = normalizeUsername(account);

  if (value.includes("@")) return value;

  if (!/^[a-z0-9_]{3,30}$/.test(value)) {
    throw new Error("帳號需為 3-30 個英數字或底線。");
  }

  return `${value}@xiang.local`;
};

const readableFirebaseError = (error) => {
  const code = error?.code || "";

  if (code === "auth/configuration-not-found") {
    return "Firebase 尚未啟用 Email/Password 登入。請到 Firebase Console > Authentication > Sign-in method 開啟 Email/Password。";
  }

  if (code === "auth/email-already-in-use") return "這個帳號已經被註冊。";
  if (code === "auth/invalid-credential") return "帳號或密碼錯誤。";
  if (code === "auth/weak-password") return "密碼至少需要 6 個字。";
  if (code === "auth/invalid-email") return "帳號格式不正確，請使用英數字或底線。";
  if (code === "auth/operation-not-allowed") return "Firebase 尚未開啟 Email/Password 登入方式。";

  return error?.message || "Firebase 操作失敗。";
};

const renderTopics = (topics) => {
  const list = document.getElementById("course-list");
  list.innerHTML = topics
    .map(
      (topic) => `
        <article class="topic-card">
          <div class="week">${escapeHtml(topic.week)}</div>
          <h3>${escapeHtml(topic.title)}</h3>
          <p>${escapeHtml(topic.summary)}</p>
          <span class="skill">${escapeHtml(topic.skill)}</span>
        </article>
      `
    )
    .join("");
};

const renderMessages = (messages) => {
  const list = document.getElementById("message-list");
  const currentUid = state.currentUser?.uid || "";

  if (!messages.length) {
    list.innerHTML = '<p class="empty">目前還沒有留言。</p>';
    document.getElementById("message-scroll-sentinel").classList.add("hidden");
    return;
  }

  list.innerHTML = messages
    .map((message) => {
      const isOwner = currentUid && message.uid === currentUid;
      const likedBy = message.likedBy || {};
      const liked = Boolean(currentUid && likedBy[currentUid]);
      const likes = Number(message.likes || 0);

      return `
        <article class="message-item" data-message-id="${escapeHtml(message.id)}">
          <div class="message-topline">
            <strong>${escapeHtml(message.name)}</strong>
            <time title="${escapeHtml(formatDate(message.createdAt))}">
              ${escapeHtml(formatRelativeTime(message.createdAt))}
            </time>
          </div>
          <p>${escapeHtml(message.content)}</p>
          ${message.edited ? '<span class="edited-label">已編輯</span>' : ""}
          <div class="message-actions">
            <button class="message-action like-action ${liked ? "active" : ""}" type="button" data-action="like">
              讚 ${likes}
            </button>
            ${isOwner ? `
              <button class="message-action" type="button" data-action="edit">編輯</button>
              <button class="message-action danger" type="button" data-action="delete">刪除</button>
            ` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  state.hasMoreMessages = messages.length >= state.messageLimit;
  state.isLoadingMoreMessages = false;
  document
    .getElementById("message-scroll-sentinel")
    .classList.toggle("hidden", !state.hasMoreMessages);
};

const renderAuth = () => {
  const isLoggedIn = Boolean(state.currentUser);
  const authForm = document.getElementById("auth-form");
  const userPanel = document.getElementById("user-panel");
  const messageForm = document.getElementById("message-form");
  const messageContent = document.getElementById("message-content");
  const formStatus = document.getElementById("form-status");

  authForm.classList.toggle("hidden", isLoggedIn);
  userPanel.classList.toggle("hidden", !isLoggedIn);
  messageForm.classList.toggle("locked", !isLoggedIn);
  messageContent.disabled = !isLoggedIn;
  messageForm.querySelector("button").disabled = !isLoggedIn;

  if (isLoggedIn) {
    text("current-user", getDisplayName(state.currentUser));
    formStatus.textContent = "你已登入，可以留言。";
  } else {
    text("current-user", "");
    formStatus.textContent = "請先登入帳號才可以留言。";
  }

  renderMessages(state.site.messages);
};

const setAuthMode = (mode) => {
  state.authMode = mode;
  document.getElementById("login-tab").classList.toggle("active", mode === "login");
  document.getElementById("register-tab").classList.toggle("active", mode === "register");
  document.getElementById("auth-submit").textContent = mode === "login" ? "登入" : "註冊";
  document.getElementById("auth-status").textContent =
    mode === "login" ? "輸入帳號與密碼登入。" : "建立帳號後會自動登入。";
};

const renderSite = (site) => {
  const { profile, topics, project, messages } = site;

  text("profile-name-detail", profile.name);
  text("profile-title", profile.title);
  text("profile-intro", profile.intro);
  text("profile-school", profile.school);
  text("profile-email", profile.email);
  text("project-name", project.name);
  text("project-goal", project.goal);
  text("project-features", project.features);
  text("project-tech", project.tech_stack);
  text("project-status", project.status);

  renderTopics(topics);
  renderMessages(messages);
  renderAuth();
};

const setupFirebaseMessages = () => {
  if (state.unsubscribeMessages) {
    state.unsubscribeMessages();
  }

  const messageQuery = query(
    collection(db, "messages"),
    orderBy("createdAt", "desc"),
    limit(state.messageLimit)
  );

  state.unsubscribeMessages = onSnapshot(messageQuery, (snapshot) => {
    state.site.messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    renderMessages(state.site.messages);
  }, (error) => {
    document.getElementById("form-status").textContent = `Firebase 留言讀取失敗：${error.message}`;
  });
};

const getMessageById = (id) => {
  return state.site.messages.find((message) => message.id === id);
};

const setupMessageListActions = () => {
  const list = document.getElementById("message-list");
  const status = document.getElementById("form-status");

  list.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const item = button.closest("[data-message-id]");
    const messageId = item?.dataset.messageId;
    const message = getMessageById(messageId);
    const action = button.dataset.action;

    if (!message || !state.currentUser) {
      status.textContent = "請先登入帳號。";
      return;
    }

    const messageRef = doc(db, "messages", messageId);

    try {
      if (action === "like") {
        if (message.likedBy?.[state.currentUser.uid]) {
          status.textContent = "你已經按過讚。";
          return;
        }

        await updateDoc(messageRef, {
          likes: increment(1),
          [`likedBy.${state.currentUser.uid}`]: true
        });
        status.textContent = "已按讚。";
      }

      if (action === "edit") {
        if (message.uid !== state.currentUser.uid) {
          throw new Error("只能編輯自己的留言。");
        }

        const nextContent = prompt("修改留言內容：", message.content);
        if (nextContent === null) return;

        const content = nextContent.trim();
        if (!content) throw new Error("留言內容不能空白。");
        if (content.length > 180) throw new Error("留言太長，請縮短到 180 字以內。");

        await updateDoc(messageRef, {
          content,
          edited: true,
          updatedAt: serverTimestamp()
        });
        status.textContent = "留言已更新。";
      }

      if (action === "delete") {
        if (message.uid !== state.currentUser.uid) {
          throw new Error("只能刪除自己的留言。");
        }

        if (!confirm("確定要刪除這則留言嗎？")) return;

        await deleteDoc(messageRef);
        status.textContent = "留言已刪除。";
      }
    } catch (error) {
      status.textContent = error.message;
    }
  });

};

const setupMessageInfiniteScroll = () => {
  const sentinel = document.getElementById("message-scroll-sentinel");

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];

    if (!entry.isIntersecting || state.isLoadingMoreMessages || !state.hasMoreMessages) {
      return;
    }

    state.isLoadingMoreMessages = true;
    state.messageLimit += 10;
    setupFirebaseMessages();
  }, {
    root: null,
    rootMargin: "160px 0px",
    threshold: 0
  });

  observer.observe(sentinel);
};

const setupAuth = () => {
  const authForm = document.getElementById("auth-form");
  const authStatus = document.getElementById("auth-status");

  document.getElementById("login-tab").addEventListener("click", () => setAuthMode("login"));
  document.getElementById("register-tab").addEventListener("click", () => setAuthMode("register"));

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authStatus.textContent = state.authMode === "login" ? "登入中..." : "註冊中...";

    try {
      const account = document.getElementById("auth-username").value;
      const email = accountToFirebaseEmail(account);
      const password = document.getElementById("auth-password").value;
      let credential;

      if (state.authMode === "login") {
        credential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        credential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", credential.user.uid), {
          username: getDisplayName(credential.user),
          authEmail: email,
          createdAt: serverTimestamp()
        });
      }

      authForm.reset();
      authStatus.textContent = "";
    } catch (error) {
      authStatus.textContent = readableFirebaseError(error);
    }
  });

  document.getElementById("logout-button").addEventListener("click", async () => {
    await signOut(auth);
  });

  onAuthStateChanged(auth, (user) => {
    state.currentUser = user;
    renderAuth();
  });

  setAuthMode("login");
};

const setupMessageForm = () => {
  const form = document.getElementById("message-form");
  const status = document.getElementById("form-status");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "送出中...";

    try {
      if (!state.currentUser) {
        throw new Error("請先登入帳號，才能留言。");
      }

      const content = document.getElementById("message-content").value.trim();

      if (!content) {
        throw new Error("請輸入留言內容。");
      }

      await addDoc(collection(db, "messages"), {
        content,
        uid: state.currentUser.uid,
        email: state.currentUser.email,
        name: getDisplayName(state.currentUser),
        likes: 0,
        likedBy: {},
        createdAt: serverTimestamp()
      });

      form.reset();
      status.textContent = "留言已存入 Firebase。";
    } catch (error) {
      status.textContent = error.message;
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  setupAuth();
  setupMessageForm();
  setupMessageListActions();
  setupMessageInfiniteScroll();
  setupFirebaseMessages();
  renderSite(state.site);
});
