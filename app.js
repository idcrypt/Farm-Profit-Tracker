// ===== Farm Profit Tracker App =====

// Global state
let currentLang = 'id';
let translations = {};
let weeklyChart = null;
let monthlyChart = null;
let editingTransaction = null; // { accId, txId } or null

// ===== Utilities =====
const $ = id => document.getElementById(id);

function getAccounts() {
  return JSON.parse(localStorage.getItem("accounts") || "[]");
}
function saveAccounts(accounts) {
  localStorage.setItem("accounts", JSON.stringify(accounts));
}
function formatCurrency(num) {
  if (currentLang === 'id') {
    return "Rp " + new Intl.NumberFormat("id-ID").format(num) + ",-";
  } else {
    return "IDR " + new Intl.NumberFormat("en-US").format(num) + ",-";
  }
}

// ===== Language Loader =====
async function loadLang(lang) {
  try {
    const res = await fetch(`lang/${lang}.json`);
    translations = await res.json();
    currentLang = lang;
    applyTranslations();
  } catch (e) {
    alert("Language file missing: " + lang);
  }
}

function applyTranslations() {
  const t = translations;
  const setText = (id, key) => { if ($(id)) $(id).innerText = t[key] || key; };
  const setPlaceholder = (id, key) => { if ($(id)) $(id).placeholder = t[key] || key; };

  setText("title", "title");
  setText("labelLang", "labelLang");
  setText("accountSectionTitle", "accountSectionTitle");
  setText("selectAccountTitle", "selectAccountTitle");
  setText("transactionSectionTitle", "transactionSectionTitle");
  setText("profitTitle", "profitTitle");
  setText("weeklyProfitTitle", "weeklyProfitTitle");
  setText("monthlyProfitTitle", "monthlyProfitTitle");
  setText("createAccountBtn", "createAccountBtn");
  setText("addTransactionBtn", "addTransactionBtn");
  setText("exportPDFBtn", "exportPDFBtn");

  setPlaceholder("cropName", "cropName");
  setPlaceholder("location", "location");
  setPlaceholder("description", "description");
  setPlaceholder("amount", "amount");

  // Update transaction type options
  const txType = $("transactionType");
  if (txType) {
    txType.innerHTML = `
      <option value="income">${t.optIncome}</option>
      <option value="expense">${t.optExpense}</option>
    `;
  }
}

// ===== Event: Language Switch =====
const langSelect = $("langSelect");
if (langSelect) {
  langSelect.addEventListener("change", e => loadLang(e.target.value));
}

// ===== Account Creation =====
const accountForm = $("accountForm");
accountForm.addEventListener("submit", e => {
  e.preventDefault();
  const crop = $("cropName").value.trim();
  const loc = $("location").value.trim();
  if (!crop || !loc) return alert("Fill crop & location");

  let accounts = getAccounts();
  if (accounts.find(a => a.cropName === crop && a.location === loc)) {
    alert("Account already exists");
    return;
  }
  accounts.push({ id: Date.now(), cropName: crop, location: loc, transactions: [] });
  saveAccounts(accounts);
  $("cropName").value = "";
  $("location").value = "";
  loadAccounts();
});

// ===== Transaction Add/Edit =====
const transactionForm = $("transactionForm");
transactionForm.addEventListener("submit", e => {
  e.preventDefault();
  const accId = parseInt($("transactionAccount").value);
  if (!accId) return alert("Select account");
  const type = $("transactionType").value;
  const amount = parseFloat($("amount").value);
  const desc = $("description").value;
  const date = $("transactionDate").value;
  if (!amount || !date) return alert("Fill amount and date");

  let accounts = getAccounts();
  const acc = accounts.find(a => a.id === accId);
  if (!acc) return;

  if (editingTransaction) {
    const tx = acc.transactions.find(t => t.id === editingTransaction.txId);
    if (tx) {
      tx.type = type;
      tx.amount = amount;
      tx.description = desc;
      tx.date = date;
    }
    editingTransaction = null;
  } else {
    acc.transactions.push({ id: Date.now(), type, amount, description: desc, date });
  }

  saveAccounts(accounts);
  transactionForm.reset();
  displayResults();
});

// ===== Load Accounts into UI =====
function loadAccounts() {
  const accounts = getAccounts();
  const list = $("accountsList");
  const select = $("transactionAccount");
  list.innerHTML = "";
  select.innerHTML = "";

  accounts.forEach(a => {
    const li = document.createElement("li");
    li.textContent = `${a.cropName} - ${a.location}`;
    list.appendChild(li);

    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = `${a.cropName} - ${a.location}`;
    select.appendChild(opt);
  });
  displayResults();
}

// ===== Display Accounts & Transactions =====
function displayResults() {
  const container = $("resultsContainer");
  container.innerHTML = "";
  const accounts = getAccounts();

  accounts.forEach(a => {
    const div = document.createElement("div");
    div.className = "account-result";

    let profit = a.transactions.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);

    div.innerHTML = `
      <h3>${a.cropName} - ${a.location}</h3>
      <p><strong>${translations.profitTitle}:</strong> ${formatCurrency(profit)}</p>
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Type</th><th>${translations.description}</th><th>${translations.amount}</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${a.transactions.map(t => `
            <tr>
              <td>${t.date}</td>
              <td>${t.type === "income" ? translations.optIncome : translations.optExpense}</td>
              <td>${t.description}</td>
              <td>${formatCurrency(t.amount)}</td>
              <td>
                <button onclick="editTransaction(${a.id},${t.id})">${translations.editBtn}</button>
                <button onclick="deleteTransaction(${a.id},${t.id})">${translations.deleteBtn}</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    container.appendChild(div);
  });

  updateCharts();
}

// ===== Edit/Delete Transactions =====
window.editTransaction = function(accId, txId) {
  const accounts = getAccounts();
  const acc = accounts.find(a => a.id === accId);
  const tx = acc.transactions.find(t => t.id === txId);
  if (!tx) return;

  $("transactionAccount").value = accId;
  $("transactionType").value = tx.type;
  $("amount").value = tx.amount;
  $("description").value = tx.description;
  $("transactionDate").value = tx.date;
  editingTransaction = { accId, txId };
};

window.deleteTransaction = function(accId, txId) {
  if (!confirm("Delete transaction?")) return;
  let accounts = getAccounts();
  const acc = accounts.find(a => a.id === accId);
  acc.transactions = acc.transactions.filter(t => t.id !== txId);
  saveAccounts(accounts);
  displayResults();
};

// ===== Charts =====
function updateCharts() {
  const accounts = getAccounts();
  const allTx = accounts.flatMap(a => a.transactions);

  // weekly
  const weekly = {};
  allTx.forEach(t => {
    const week = getWeek(new Date(t.date));
    weekly[week] = (weekly[week] || 0) + (t.type === "income" ? t.amount : -t.amount);
  });

  const ctxW = $("weeklyChart");
  if (ctxW) {
    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(ctxW.getContext("2d"), {
      type: "bar",
      data: {
        labels: Object.keys(weekly),
        datasets: [{ label: translations.weeklyProfitTitle, data: Object.values(weekly), backgroundColor: "#0ff" }]
      }
    });
  }

  // monthly
  const monthly = {};
  allTx.forEach(t => {
    const month = t.date.slice(0, 7);
    monthly[month] = (monthly[month] || 0) + (t.type === "income" ? t.amount : -t.amount);
  });

  const ctxM = $("monthlyChart");
  if (ctxM) {
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctxM.getContext("2d"), {
      type: "line",
      data: {
        labels: Object.keys(monthly),
        datasets: [{ label: translations.monthlyProfitTitle, data: Object.values(monthly), borderColor: "#f0f", fill: false }]
      }
    });
  }
}

function getWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return "W" + Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ===== Export PDF =====
const { jsPDF } = window.jspdf;
$("exportPDFBtn").addEventListener("click", () => {
  const accounts = getAccounts();
  if (!accounts.length) return alert("No data");

  const start = $("startDate")?.value ? new Date($("startDate").value) : null;
  const end = $("endDate")?.value ? new Date($("endDate").value) : null;

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Farm Profit Report", 105, 20, null, null, "center");
  doc.setFontSize(12);
  let y = 30;

  accounts.forEach(a => {
    const txs = a.transactions.filter(t => {
      const d = new Date(t.date);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
    if (!txs.length) return;

    let profit = txs.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);

    doc.setFontSize(14);
    doc.text(`${a.cropName} - ${a.location}`, 10, y);
    y += 8;

    doc.setFontSize(11);
    doc.text("Date", 10, y);
    doc.text("Type", 40, y);
    doc.text(translations.description, 80, y);
    doc.text(translations.amount, 170, y, { align: "right" });
    y += 6;
    doc.line(10, y, 200, y);
    y += 4;

    txs.forEach(t => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(t.date, 10, y);
      doc.text(t.type === "income" ? translations.optIncome : translations.optExpense, 40, y);
      doc.text(t.description, 80, y);
      doc.text(formatCurrency(t.amount), 170, y, { align: "right" });
      y += 6;
    });

    y += 4;
    doc.line(10, y, 200, y);
    y += 6;

    doc.setFontSize(12);
    doc.text(`${translations.profitTitle}: ${formatCurrency(profit)}`, 10, y);
    y += 12;
  });

  doc.save("Farm_Profit_Report.pdf");
});

// ===== Init =====
loadLang(currentLang);
loadAccounts();
