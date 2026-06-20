// 記帳 app 核心邏輯
const STORAGE_KEY = "expense_records";
const CATEGORIES = {
  income: "收入",
  food: "飲食",
  transport: "交通",
  shopping: "購物",
  entertainment: "娛樂",
  other: "其他"
};

let expenses = [];
let currentFilter = "all";

// 初始化
const init = () => {
  loadExpenses();
  setupEventListeners();
  setTodayDate();
  renderExpenses();
  updateSummary();
};

// 從 localStorage 載入記錄
const loadExpenses = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    expenses = stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("載入記錄失敗:", e);
    expenses = [];
  }
};

// 儲存到 localStorage
const saveExpenses = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error("儲存記錄失敗:", e);
  }
};

// 設定今天日期為預設值
const setTodayDate = () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("expense-date").value = today;
};

// 事件監聽
const setupEventListeners = () => {
  // 表單提交
  document.getElementById("expense-form").addEventListener("submit", handleAddExpense);

  // 篩選按鈕
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      currentFilter = e.target.dataset.filter;
      renderExpenses();
    });
  });
};

// 新增支出
const handleAddExpense = (e) => {
  e.preventDefault();

  const date = document.getElementById("expense-date").value;
  const category = document.getElementById("expense-category").value;
  const amount = parseFloat(document.getElementById("expense-amount").value);
  const description = document.getElementById("expense-description").value;

  if (!date || !category || !amount || amount <= 0) {
    alert("請填寫完整資訊");
    return;
  }

  const expense = {
    id: Date.now(),
    date,
    category,
    amount,
    description: description || CATEGORIES[category]
  };

  expenses.push(expense);
  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveExpenses();

  // 重置表單
  document.getElementById("expense-form").reset();
  setTodayDate();

  renderExpenses();
  updateSummary();
};

// 刪除項目
const deleteExpense = (id) => {
  if (confirm("確定要刪除這筆記錄嗎？")) {
    expenses = expenses.filter((e) => e.id !== id);
    saveExpenses();
    renderExpenses();
    updateSummary();
  }
};

// 渲染列表
const renderExpenses = () => {
  const list = document.getElementById("expense-list");

  let filtered = expenses;
  if (currentFilter === "income") {
    filtered = expenses.filter((e) => e.category === "income");
  } else if (currentFilter === "expense") {
    filtered = expenses.filter((e) => e.category !== "income");
  }

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-message">還沒有相符的記帳紀錄</p>';
    return;
  }

  list.innerHTML = filtered
    .map((expense) => {
      const isIncome = expense.category === "income";
      const amountClass = isIncome ? "income" : "expense";
      const amountSign = isIncome ? "+" : "-";
      const dateObj = new Date(expense.date);
      const dateStr = dateObj.toLocaleDateString("zh-TW");

      return `
        <article class="expense-item" data-id="${expense.id}">
          <div class="expense-item-content">
            <div class="expense-item-header">
              <span class="expense-category-badge ${expense.category}">
                ${CATEGORIES[expense.category]}
              </span>
              <span class="expense-item-date">${dateStr}</span>
            </div>
            <div class="expense-item-desc">${escapeHtml(expense.description)}</div>
          </div>
          <div class="expense-item-amount ${amountClass}">
            ${amountSign}$${expense.amount.toFixed(2)}
          </div>
          <button class="delete-btn" type="button" onclick="deleteExpense(${expense.id})">
            刪除
          </button>
        </article>
      `;
    })
    .join("");
};

// 更新統計
const updateSummary = () => {
  const income = expenses
    .filter((e) => e.category === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  const expense = expenses
    .filter((e) => e.category !== "income")
    .reduce((sum, e) => sum + e.amount, 0);

  const balance = income - expense;

  document.getElementById("summary-income").textContent = `$${income.toFixed(2)}`;
  document.getElementById("summary-expense").textContent = `$${expense.toFixed(2)}`;
  document.getElementById("summary-balance").textContent = `$${balance.toFixed(2)}`;
};

// 防止 XSS
const escapeHtml = (text) => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

// 頁面載入時初始化
document.addEventListener("DOMContentLoaded", init);
