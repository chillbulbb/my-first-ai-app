/* ==========================================================================
   AuraWealth Bookkeeping Core JavaScript
   ========================================================================== */

// 1. Categories Definition with Icons and HSL/Hex Colors
const CATEGORIES = {
  expense: {
    food: { label: '餐飲', icon: 'fa-utensils', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    shopping: { label: '服飾', icon: 'fa-bag-shopping', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
    transport: { label: '交通', icon: 'fa-car', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    entertainment: { label: '娛樂', icon: 'fa-gamepad', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
    home: { label: '居家生活', icon: 'fa-house', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)' },
    medical: { label: '醫療保健', icon: 'fa-heart-pulse', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)' },
    education: { label: '教育學習', icon: 'fa-graduation-cap', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' },
    other_expense: { label: '其他支出', icon: 'fa-ellipsis', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' }
  },
  income: {
    salary: { label: '工作薪資', icon: 'fa-wallet', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    investment: { label: '投資理財', icon: 'fa-chart-line', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
    bonus: { label: '獎金紅利', icon: 'fa-gift', color: '#d946ef', bg: 'rgba(217, 70, 239, 0.12)' },
    other_income: { label: '其他收入', icon: 'fa-coins', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.12)' }
  }
};

// 2. Global State Variables
let transactions = [];
let currentType = 'expense'; // 'expense' or 'income'
let trendChartInstance = null;
let categoryChartInstance = null;
let currentPhotoBase64 = null; // 暫存目前拍照/上傳的 Base64 圖片

// DOM Elements
const balanceValEl = document.getElementById('val-balance');
const incomeValEl = document.getElementById('val-income');
const expenseValEl = document.getElementById('val-expense');
const txCountEl = document.getElementById('tx-count');
const transactionsContainer = document.getElementById('transactions-container');

const monthFilter = document.getElementById('filter-month');
const categoryFilter = document.getElementById('filter-category');
const searchNoteInput = document.getElementById('search-note');

const btnOpenModal = document.getElementById('btn-open-modal');
const btnQuickCamera = document.getElementById('btn-quick-camera');
const cameraInput = document.getElementById('cameraInput');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const transactionDialog = document.getElementById('transaction-dialog');
const transactionForm = document.getElementById('transaction-form');
const typeToggleButtons = document.querySelectorAll('.type-toggle .toggle-btn');

const formAmount = document.getElementById('tx-amount');
const formCategory = document.getElementById('tx-category');
const formDate = document.getElementById('tx-date');
const formNote = document.getElementById('tx-note');

// 拍照與燈箱相關 DOM
const txPhotoInput = document.getElementById('tx-photo-input');
const btnCapturePhoto = document.getElementById('btn-capture-photo');
const btnRemovePhoto = document.getElementById('btn-remove-photo');
const cameraPreviewThumbnail = document.getElementById('camera-preview-thumbnail');
const photoPreviewBox = document.getElementById('photo-preview-box');
const photoPreviewImg = document.getElementById('photo-preview-img');

const photoLightbox = document.getElementById('photo-lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const btnCloseLightbox = document.getElementById('btn-close-lightbox');

const btnMockData = document.getElementById('btn-mock-data');
const btnExport = document.getElementById('btn-export');
const btnImportTrigger = document.getElementById('btn-import-trigger');
const fileImportInput = document.getElementById('file-import');
const btnClearAll = document.getElementById('btn-clear-all');

// Helper: Format Currency (Traditional Chinese Style)
function formatCurrency(amount) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

// Helper: Get Category details
function getCategoryInfo(type, key) {
  return CATEGORIES[type][key] || {
    label: '未知類別',
    icon: 'fa-question',
    color: '#6b7280',
    bg: 'rgba(107, 114, 128, 0.15)'
  };
}

// 3. Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Load initial data
  const stored = localStorage.getItem('aurawealth_transactions');
  if (stored) {
    try {
      transactions = JSON.parse(stored);
    } catch (e) {
      transactions = [];
    }
  }

  // Set default form date to today
  setDefaultDate();

  // Populate Filter Categories Dropdown
  populateFilterCategories();

  // Initial render
  updateUI();

  // Event Listeners Setup
  setupEventListeners();
});

// Set default form date to today (local time)
function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  formDate.value = `${yyyy}-${mm}-${dd}`;
}

// Setup all Event Listeners
function setupEventListeners() {
  // Modal toggle actions
  btnOpenModal.addEventListener('click', () => {
    setDefaultDate();
    resetForm();
    populateFormCategories();
    transactionDialog.showModal();
  });

  const closeModal = () => {
    transactionDialog.close();
  };

  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  // Type Toggle inside form (Income / Expense)
  typeToggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      typeToggleButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentType = e.target.getAttribute('data-type');
      populateFormCategories();
    });
  });

  // Form Submit Action
  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveTransaction();
    transactionDialog.close();
  });

  // Filter Event Listeners
  monthFilter.addEventListener('change', updateUI);
  categoryFilter.addEventListener('change', updateUI);
  searchNoteInput.addEventListener('input', updateUI);

  // Mock Data Trigger
  btnMockData.addEventListener('click', generateMockData);

  // Export Data Trigger
  btnExport.addEventListener('click', exportData);

  // Import Data Actions
  btnImportTrigger.addEventListener('click', () => fileImportInput.click());
  fileImportInput.addEventListener('change', importData);

  // Clear All Data
  btnClearAll.addEventListener('click', clearAllData);

  // 拍照按鈕觸發 file input
  btnCapturePhoto.addEventListener('click', () => {
    txPhotoInput.click();
  });

  // 一鍵拍照按鈕 (Header)
  btnQuickCamera.addEventListener('click', () => {
    cameraInput.click();
  });

  // 處理相片選取/拍攝與等比例壓縮
  txPhotoInput.addEventListener('change', handlePhotoUpload);
  cameraInput.addEventListener('change', (e) => {
    handlePhotoUpload(e, true); // true 表示需要開啟彈窗
  });

  // 移除相片
  btnRemovePhoto.addEventListener('click', removePhoto);

  // 關閉燈箱
  btnCloseLightbox.addEventListener('click', () => {
    photoLightbox.close();
  });

  // 點擊燈箱背景關閉
  photoLightbox.addEventListener('click', (e) => {
    if (e.target === photoLightbox) {
      photoLightbox.close();
    }
  });
}

// 處理相片上傳/拍攝，並使用 Canvas 進行等比例壓縮 (最大邊長 800px)
function handlePhotoUpload(event, autoOpenModal = false) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      // 設定最大邊長限制
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      // 等比例縮放
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      // 建立 Canvas 進行繪製與壓縮
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 轉為 Base64（JPEG 格式，品質設為 0.85）
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

      // 如果需要自動開啟彈窗，先重設表單
      if (autoOpenModal) {
        setDefaultDate();
        resetForm();
        populateFormCategories();
        transactionDialog.showModal();
      }

      // 儲存至暫存變數並更新 UI 預覽
      currentPhotoBase64 = compressedBase64;
      photoPreviewImg.src = compressedBase64;
      photoPreviewBox.style.display = 'flex';
      btnRemovePhoto.style.display = 'inline-flex';

      // 更新縮圖預覽 (camera-preview-thumbnail)
      if (cameraPreviewThumbnail) {
        cameraPreviewThumbnail.innerHTML = `<img src="${compressedBase64}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 2px solid var(--color-primary);">`;
        cameraPreviewThumbnail.style.display = 'block';
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 移除暫存相片與清除 UI 預覽
function removePhoto() {
  currentPhotoBase64 = null;
  txPhotoInput.value = '';
  cameraInput.value = ''; // 同步清除
  photoPreviewImg.src = '';
  photoPreviewBox.style.display = 'none';
  btnRemovePhoto.style.display = 'none';
  if (cameraPreviewThumbnail) {
    cameraPreviewThumbnail.innerHTML = '';
    cameraPreviewThumbnail.style.display = 'none';
  }
}

// Populate Category Filter dropdown with all categories
function populateFilterCategories() {
  categoryFilter.innerHTML = '<option value="all">所有類別</option>';

  // Add Expense Headers and Categories
  const expOptGroup = document.createElement('optgroup');
  expOptGroup.label = '支出類別';
  Object.keys(CATEGORIES.expense).forEach(key => {
    const opt = document.createElement('option');
    opt.value = `expense:${key}`;
    opt.textContent = CATEGORIES.expense[key].label;
    expOptGroup.appendChild(opt);
  });
  categoryFilter.appendChild(expOptGroup);

  // Add Income Headers and Categories
  const incOptGroup = document.createElement('optgroup');
  incOptGroup.label = '收入類別';
  Object.keys(CATEGORIES.income).forEach(key => {
    const opt = document.createElement('option');
    opt.value = `income:${key}`;
    opt.textContent = CATEGORIES.income[key].label;
    incOptGroup.appendChild(opt);
  });
  categoryFilter.appendChild(incOptGroup);
}

// Populate Modal Form Categories based on selected transaction type (Income/Expense)
function populateFormCategories() {
  formCategory.innerHTML = '';
  const list = CATEGORIES[currentType];
  Object.keys(list).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = list[key].label;
    formCategory.appendChild(opt);
  });
}

// Reset Form Fields
function resetForm() {
  formAmount.value = '';
  formNote.value = '';
  currentType = 'expense';
  typeToggleButtons.forEach(btn => {
    if (btn.getAttribute('data-type') === 'expense') btn.classList.add('active');
    else btn.classList.remove('active');
  });
  removePhoto();
}

// Save New Transaction
function saveTransaction() {
  const amount = parseFloat(formAmount.value);
  const category = formCategory.value;
  const date = formDate.value;
  const note = formNote.value.trim();

  if (isNaN(amount) || amount <= 0 || !category || !date) {
    alert('請填寫完整的必填欄位！');
    return;
  }

  const newTx = {
    id: Date.now().toString(),
    type: currentType,
    amount: amount,
    category: category,
    date: date,
    note: note || getCategoryInfo(currentType, category).label,
    photo: currentPhotoBase64
  };

  transactions.push(newTx);
  saveToLocalStorage();
  updateUI();
}

// Delete Specific Transaction
function deleteTransaction(id) {
  if (confirm('確定要刪除此筆記錄嗎？')) {
    transactions = transactions.filter(tx => tx.id !== id);
    saveToLocalStorage();
    updateUI();
  }
}

// Save data to localStorage
function saveToLocalStorage() {
  localStorage.setItem('aurawealth_transactions', JSON.stringify(transactions));
}

// Populate Month Filter Dropdown dynamically based on transactions dates
function populateMonthFilter(selectedMonth) {
  const months = new Set();
  transactions.forEach(tx => {
    if (tx.date) {
      months.add(tx.date.substring(0, 7)); // YYYY-MM
    }
  });

  // Convert to sorted array descending
  const sortedMonths = Array.from(months).sort().reverse();

  // Cache the current value
  const currentValue = selectedMonth || monthFilter.value || 'all';

  monthFilter.innerHTML = '<option value="all">所有月份</option>';

  sortedMonths.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    // Format YYYY-MM as YYYY年MM月 for cleaner UI
    const parts = m.split('-');
    opt.textContent = `${parts[0]}年${parts[1]}月`;
    monthFilter.appendChild(opt);
  });

  // Restore previous value if it still exists in the newly populated list
  if (Array.from(monthFilter.options).some(opt => opt.value === currentValue)) {
    monthFilter.value = currentValue;
  } else {
    monthFilter.value = 'all';
  }
}

// Core: Update UI and Refresh Analytics Charts
function updateUI() {
  // 1. Populate Month Filter first
  populateMonthFilter();

  const selectedMonth = monthFilter.value; // 'all' or 'YYYY-MM'
  const selectedCatFilter = categoryFilter.value; // 'all' or 'type:category_key'
  const searchQuery = searchNoteInput.value.trim().toLowerCase();

  // 2. Filter Transactions for rendering the list and calculations
  const filteredTxs = transactions.filter(tx => {
    // Month filter check
    if (selectedMonth !== 'all' && tx.date.substring(0, 7) !== selectedMonth) {
      return false;
    }
    // Category filter check
    if (selectedCatFilter !== 'all') {
      const [fType, fKey] = selectedCatFilter.split(':');
      if (tx.type !== fType || tx.category !== fKey) {
        return false;
      }
    }
    // Text search filter check
    if (searchQuery) {
      const matchNote = tx.note.toLowerCase().includes(searchQuery);
      const categoryLabel = getCategoryInfo(tx.type, tx.category).label.toLowerCase();
      const matchCat = categoryLabel.includes(searchQuery);
      const matchAmount = tx.amount.toString().includes(searchQuery);
      if (!matchNote && !matchCat && !matchAmount) {
        return false;
      }
    }
    return true;
  });

  // Sort by date descending
  filteredTxs.sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return b.id.localeCompare(a.id);
  });

  // Render transactions count
  txCountEl.textContent = `共 ${filteredTxs.length} 筆交易`;

  // 3. Render Dashboard Metrics
  // We show Balance as overall lifetime asset, and monthly totals based on month selection
  let lifetimeIncome = 0;
  let lifetimeExpense = 0;
  let targetIncome = 0;
  let targetExpense = 0;

  // Get current calendar month if 'all' is selected, to show default monthly metrics
  const currentCalMonth = new Date().toISOString().substring(0, 7);
  const activeMonth = selectedMonth === 'all' ? currentCalMonth : selectedMonth;

  transactions.forEach(tx => {
    const txVal = parseFloat(tx.amount) || 0;

    // Lifetime balance metrics
    if (tx.type === 'income') lifetimeIncome += txVal;
    else if (tx.type === 'expense') lifetimeExpense += txVal;

    // Filtered / Active Month metrics
    if (tx.date.substring(0, 7) === activeMonth) {
      if (tx.type === 'income') targetIncome += txVal;
      else if (tx.type === 'expense') targetExpense += txVal;
    }
  });

  const lifetimeBalance = lifetimeIncome - lifetimeExpense;

  // Set metric labels dynamically
  const monthLabel = selectedMonth === 'all' ? '本月' : `${activeMonth.split('-')[1]}月`;
  document.querySelector('.metric-card.income h3').textContent = `${monthLabel}總收入`;
  document.querySelector('.metric-card.expense h3').textContent = `${monthLabel}總支出`;

  // Render values
  balanceValEl.textContent = formatCurrency(lifetimeBalance);
  incomeValEl.textContent = formatCurrency(targetIncome);
  expenseValEl.textContent = formatCurrency(targetExpense);

  // Apply visual colors for balance (green if positive, red if negative)
  if (lifetimeBalance >= 0) {
    balanceValEl.style.color = 'var(--text-primary)';
  } else {
    balanceValEl.style.color = 'var(--color-expense)';
  }

  // 4. Render Transaction List
  transactionsContainer.innerHTML = '';

  if (filteredTxs.length === 0) {
    transactionsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <p>沒有找到任何交易記錄</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">請點擊「新增交易」或「模擬資料」開始記帳！</p>
      </div>
    `;
  } else {
    filteredTxs.forEach(tx => {
      const catInfo = getCategoryInfo(tx.type, tx.category);
      const row = document.createElement('div');
      row.className = 'transaction-row';

      const isIncome = tx.type === 'income';
      const amountPrefix = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'income' : 'expense';

      const photoHtml = tx.photo
        ? `<div class="t-photo-thumb" title="點擊檢視照片"><img src="${tx.photo}" alt="交易照片"></div>`
        : '';

      row.innerHTML = `
        <div class="t-left">
          <div class="t-icon-box" style="background: ${catInfo.bg}; color: ${catInfo.color}">
            <i class="fa-solid ${catInfo.icon}"></i>
          </div>
          <div class="t-info">
            <span class="t-category">${catInfo.label}</span>
            <span class="t-note">${tx.note}</span>
          </div>
        </div>
        <div class="t-right">
          ${photoHtml}
          <div class="t-details">
            <span class="t-amount ${amountClass}">${amountPrefix}${formatCurrency(tx.amount)}</span>
            <span class="t-date">${tx.date}</span>
          </div>
          <button class="t-delete-btn" data-id="${tx.id}" title="刪除此交易">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;

      // Set listener on delete button
      row.querySelector('.t-delete-btn').addEventListener('click', () => {
        deleteTransaction(tx.id);
      });

      // 如果有照片，點擊開啟燈箱
      if (tx.photo) {
        row.querySelector('.t-photo-thumb').addEventListener('click', () => {
          lightboxImg.src = tx.photo;
          photoLightbox.showModal();
        });
      }

      transactionsContainer.appendChild(row);
    });
  }

  // 5. Update Charts
  renderTrendChart();
  renderCategoryChart(activeMonth);
}

// 4. Chart 1: Monthly Spend Trend (Last 6 Months)
function renderTrendChart() {
  const ctx = document.getElementById('trendChart').getContext('2d');

  // Compute past 6 months dynamically (e.g. Month Year format)
  const monthLabels = [];
  const monthlyExpenseData = [];
  const monthlyIncomeData = [];

  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const monthStr = `${yyyy}-${mm}`;

    // Label display YYYY/MM
    monthLabels.push(`${yyyy}/${mm}`);

    // Aggregate values
    let expSum = 0;
    let incSum = 0;
    transactions.forEach(tx => {
      if (tx.date && tx.date.substring(0, 7) === monthStr) {
        if (tx.type === 'expense') expSum += parseFloat(tx.amount) || 0;
        else if (tx.type === 'income') incSum += parseFloat(tx.amount) || 0;
      }
    });
    monthlyExpenseData.push(expSum);
    monthlyIncomeData.push(incSum);
  }

  // Destroy existing chart to prevent overlay bugs
  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  // Create new chart
  trendChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: '月總收入',
          data: monthlyIncomeData,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderRadius: 6,
          barThickness: 16
        },
        {
          label: '月總支出',
          data: monthlyExpenseData,
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderColor: '#ef4444',
          borderWidth: 1.5,
          borderRadius: 6,
          barThickness: 16
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#94a3b8',
            font: { family: 'Noto Sans TC', size: 11, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#fff',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
          bodyFont: { family: 'Outfit' }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Outfit', size: 11 },
            callback: value => '$' + value.toLocaleString()
          }
        }
      }
    }
  });
}

// 5. Chart 2: Category Breakdown (Doughnut Chart of Selected Month)
function renderCategoryChart(activeMonth) {
  const ctx = document.getElementById('categoryChart').getContext('2d');

  // Aggregate expenses in activeMonth by category key
  const categorySums = {};
  // Pre-fill categories keys
  Object.keys(CATEGORIES.expense).forEach(key => {
    categorySums[key] = 0;
  });

  let totalExpenses = 0;
  transactions.forEach(tx => {
    if (tx.type === 'expense' && tx.date.substring(0, 7) === activeMonth) {
      const amount = parseFloat(tx.amount) || 0;
      categorySums[tx.category] = (categorySums[tx.category] || 0) + amount;
      totalExpenses += amount;
    }
  });

  const chartLabels = [];
  const chartData = [];
  const chartColors = [];

  Object.keys(categorySums).forEach(key => {
    const val = categorySums[key];
    if (val > 0) {
      chartLabels.push(CATEGORIES.expense[key].label);
      chartData.push(val);
      chartColors.push(CATEGORIES.expense[key].color);
    }
  });

  // Destroy existing chart to prevent overlay bugs
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  // If no expenses this month, render empty pie placeholder
  if (chartData.length === 0) {
    categoryChartInstance = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['無支出記錄'],
        datasets: [{
          data: [1],
          backgroundColor: ['rgba(255, 255, 255, 0.05)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: () => '當月無任何支出記錄'
            }
          }
        }
      }
    });
    return;
  }

  categoryChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: chartLabels,
      datasets: [
        {
          data: chartData,
          backgroundColor: chartColors,
          borderWidth: 1,
          borderColor: 'rgba(15, 23, 42, 0.5)',
          hoverOffset: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#94a3b8',
            font: { family: 'Noto Sans TC', size: 10, weight: '500' },
            boxWidth: 12,
            padding: 8
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const val = context.raw;
              const percentage = ((val / totalExpenses) * 100).toFixed(1);
              return ` ${context.label}: $${val.toLocaleString()} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// 6. Generate Mock Data (20 transactions across 4 months)
function generateMockData() {
  if (transactions.length > 0 && !confirm('此操作將會清空或覆蓋當前的所有記帳記錄。確定要載入模擬資料嗎？')) {
    return;
  }

  const today = new Date();
  const mockTransactions = [];

  // Categories reference
  const expCategories = Object.keys(CATEGORIES.expense);
  const incCategories = Object.keys(CATEGORIES.income);

  // Notes pools for realistic transactions
  const expenseNotes = {
    food: ['麥當勞漢堡', '火鍋晚餐', '早安美芝城', '星巴克拿鐵', '超商飯糰', '拉麵'],
    shopping: ['UNIQLO 外套', 'Nike 慢跑鞋', '藍牙耳機', '夏季襯衫'],
    transport: ['悠遊卡加值', 'Uber 乘車費', '加油費用', '高鐵票台北來回'],
    entertainment: ['Netflix 月費', 'Steam 遊戲', '電影票2張', 'KTV聚會'],
    home: ['電費帳單', '衛生紙', '宜家收納盒', '自來水費'],
    medical: ['感冒門診', '眼藥水與維他命', '牙醫洗牙'],
    education: ['線上英文課程', '程式書籍'],
    other_expense: ['跨行轉帳手續費', '捐款']
  };

  const incomeNotes = {
    salary: ['月薪入帳', '兼職接案外包費'],
    investment: ['台股股利', '美債利息'],
    bonus: ['端午節禮金', '績效獎金'],
    other_income: ['二手拍賣所得', '發票中獎']
  };

  // Generate data over past 4 months (e.g. current month, current-1, current-2, current-3)
  for (let i = 3; i >= 0; i--) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 15);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');

    // 1. Add static monthly income
    // Regular Salary
    mockTransactions.push({
      id: `mock-inc-salary-${i}`,
      type: 'income',
      amount: 45000 + Math.floor(Math.random() * 5000),
      category: 'salary',
      date: `${year}-${month}-05`,
      note: '月度基本薪資'
    });

    // Random secondary income
    if (Math.random() > 0.4) {
      const incCat = incCategories[Math.floor(Math.random() * (incCategories.length - 1) + 1)]; // exclude salary
      const pool = incomeNotes[incCat];
      mockTransactions.push({
        id: `mock-inc-other-${i}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'income',
        amount: 1000 + Math.floor(Math.random() * 8000),
        category: incCat,
        date: `${year}-${month}-${String(10 + Math.floor(Math.random() * 15)).padStart(2, '0')}`,
        note: pool[Math.floor(Math.random() * pool.length)]
      });
    }

    // 2. Add multiple expenses
    const numExpenses = 8 + Math.floor(Math.random() * 6); // 8-13 expenses per month
    for (let j = 0; j < numExpenses; j++) {
      const expCat = expCategories[Math.floor(Math.random() * expCategories.length)];
      const notePool = expenseNotes[expCat];
      const note = notePool[Math.floor(Math.random() * notePool.length)];

      // Amount generation based on category types
      let amount = 80 + Math.floor(Math.random() * 300);
      if (expCat === 'shopping') amount = 800 + Math.floor(Math.random() * 3000);
      if (expCat === 'home') amount = 500 + Math.floor(Math.random() * 1500);
      if (expCat === 'entertainment') amount = 300 + Math.floor(Math.random() * 1000);

      // Random date inside the month
      const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');

      mockTransactions.push({
        id: `mock-exp-${i}-${j}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'expense',
        amount: amount,
        category: expCat,
        date: `${year}-${month}-${day}`,
        note: note
      });
    }
  }

  // Load mock transactions and render
  transactions = mockTransactions;
  saveToLocalStorage();
  updateUI();
  alert('已成功載入模擬記帳資料！');
}

// 7. Backup Export Data (Export to JSON File)
function exportData() {
  if (transactions.length === 0) {
    alert('當前沒有任何記帳資料可匯出！');
    return;
  }

  const dataStr = JSON.stringify(transactions, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

  const tempLink = document.createElement('a');
  tempLink.href = url;
  tempLink.download = `aurawealth_backup_${dateStr}.json`;

  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
  URL.revokeObjectURL(url);
}

// 8. Backup Import Data (Import from JSON File)
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const parsed = JSON.parse(e.target.result);

      // Simple structure validation
      if (!Array.isArray(parsed)) {
        throw new Error('匯入資料必須是 JSON 陣列！');
      }

      const isValid = parsed.every(tx => {
        return tx.id && tx.type && tx.amount && tx.category && tx.date && tx.note;
      });

      if (!isValid) {
        throw new Error('資料結構有誤，缺少必要欄位！');
      }

      if (confirm(`確認要匯入 ${parsed.length} 筆交易記錄嗎？這將覆蓋當前所有資料。`)) {
        transactions = parsed;
        saveToLocalStorage();
        updateUI();
        alert('資料匯入成功！');
      }
    } catch (err) {
      alert(`匯入失敗：${err.message}`);
    }
    // Clear the input file value so another load event triggers next time
    event.target.value = '';
  };
  reader.readAsText(file);
}

// 9. Clear All Local Data
function clearAllData() {
  if (confirm('警告：這將會永久刪除您所有的記帳記錄，且無法還原！確定要清空嗎？')) {
    transactions = [];
    saveToLocalStorage();
    updateUI();
    alert('已清除所有記帳記錄。');
  }
}
