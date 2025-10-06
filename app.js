document.addEventListener("DOMContentLoaded", () => {
  // ==============================
  // GLOBAL VAR
  // ==============================
  let accounts = JSON.parse(localStorage.getItem("accounts")) || [];
  let currentAccountIndex = null;
  let weeklyChart, monthlyChart;
  let translations = {};
  let currentLang = "en";

  // ==============================
  // ELEMENTS
  // ==============================
  const accountForm = document.getElementById("accountForm");
  const cropNameInput = document.getElementById("cropName");
  const locationInput = document.getElementById("location");
  const accountSelect = document.getElementById("accountSelect");
  const accountsList = document.getElementById("accountsList");

  const transactionForm = document.getElementById("transactionForm");
  const dateInput = document.getElementById("dateInput");
  const descriptionInput = document.getElementById("description");
  const amountInput = document.getElementById("amount");
  const typeSelect = document.getElementById("type");

  const resultsDiv = document.getElementById("results");
  const exportPDFBtn = document.getElementById("exportPDFBtn");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");

  const langSelect = document.getElementById("langSelect");

  // ==============================
  // HELPER
  // ==============================
  function saveAccounts() {
    localStorage.setItem("accounts", JSON.stringify(accounts));
  }

  function formatCurrency(num) {
    if (currentLang === "id") {
      return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(num);
    } else {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
    }
  }

  // ==============================
  // LOAD ACCOUNTS
  // ==============================
  function loadAccounts() {
    if (!accountSelect || !accountsList) return;
    accountSelect.innerHTML = "";
    accountsList.innerHTML = "";

    accounts.forEach((acc, i) => {
      let option = document.createElement("option");
      option.value = i;
      option.textContent = acc.name + " - " + acc.location;
      accountSelect.appendChild(option);

      let div = document.createElement("div");
      div.textContent = acc.name + " (" + acc.location + ")";
      accountsList.appendChild(div);
    });

    if (accounts.length > 0) {
      if (currentAccountIndex === null) currentAccountIndex = 0;
      accountSelect.value = currentAccountIndex;
      displayResults();
    } else {
      resultsDiv.innerHTML = "";
      if (weeklyChart) weeklyChart.destroy();
      if (monthlyChart) monthlyChart.destroy();
    }
  }

  // ==============================
  // DISPLAY RESULTS
  // ==============================
  function displayResults() {
    if (currentAccountIndex === null) return;
    let acc = accounts[currentAccountIndex];
    if (!acc) return;

    let income = acc.transactions.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
    let expense = acc.transactions.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);
    let profit = income - expense;

    let html = `<h3>${translations["profitTitle"] || "Profit"}</h3>`;
    html += `<p>Income: ${formatCurrency(income)}</p>`;
    html += `<p>Expense: ${formatCurrency(expense)}</p>`;
    html += `<p><b>${profit >= 0 ? "Profit" : "Loss"}: ${formatCurrency(profit)}</b></p>`;

    // Transactions List
    html += "<table border='1' width='100%' style='margin-top:10px;text-align:left;'>";
    html += "<tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Action</th></tr>";
    acc.transactions.forEach((t, idx) => {
      html += `<tr>
        <td>${t.date}</td>
        <td>${t.description}</td>
        <td>${t.type}</td>
        <td>${formatCurrency(t.amount)}</td>
        <td>
          <button onclick="editTransaction(${idx})">${translations["editBtn"] || "Edit"}</button>
          <button onclick="deleteTransaction(${idx})">${translations["deleteBtn"] || "Delete"}</button>
        </td>
      </tr>`;
    });
    html += "</table>";

    resultsDiv.innerHTML = html;

    updateCharts(acc.transactions);
  }

  // ==============================
  // UPDATE CHARTS
  // ==============================
  function updateCharts(transactions) {
    const weekData = {};
    const monthData = {};

    transactions.forEach(t => {
      let d = new Date(t.date);
      let week = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
      let month = `${d.getFullYear()}-${d.getMonth() + 1}`;

      let val = t.type === "income" ? t.amount : -t.amount;
      weekData[week] = (weekData[week] || 0) + val;
      monthData[month] = (monthData[month] || 0) + val;
    });

    // Weekly
    const weekLabels = Object.keys(weekData);
    const weekVals = Object.values(weekData);

    if (weeklyChart) weeklyChart.destroy();
    const ctxW = document.getElementById("weeklyChart").getContext("2d");
    weeklyChart = new Chart(ctxW, {
      type: "line",
      data: { labels: weekLabels, datasets: [{ label: translations["weeklyProfitTitle"] || "Weekly Profit", data: weekVals, borderColor: "lime", fill: false }] }
    });

    // Monthly
    const monthLabels = Object.keys(monthData);
    const monthVals = Object.values(monthData);

    if (monthlyChart) monthlyChart.destroy();
    const ctxM = document.getElementById("monthlyChart").getContext("2d");
    monthlyChart = new Chart(ctxM, {
      type: "bar",
      data: { labels: monthLabels, datasets: [{ label: translations["monthlyProfitTitle"] || "Monthly Profit", data: monthVals, backgroundColor: "aqua" }] }
    });
  }

  // ==============================
  // EVENT LISTENERS
  // ==============================
  if (accountForm) {
    accountForm.addEventListener("submit", e => {
      e.preventDefault();
      let acc = {
        name: cropNameInput.value,
        location: locationInput.value,
        transactions: []
      };
      accounts.push(acc);
      saveAccounts();
      currentAccountIndex = accounts.length - 1;
      loadAccounts();
      accountForm.reset();
    });
  }

  if (accountSelect) {
    accountSelect.addEventListener("change", () => {
      currentAccountIndex = parseInt(accountSelect.value);
      displayResults();
    });
  }

  if (transactionForm) {
    transactionForm.addEventListener("submit", e => {
      e.preventDefault();
      if (currentAccountIndex === null) return;

      let acc = accounts[currentAccountIndex];
      let t = {
        date: dateInput.value,
        description: descriptionInput.value,
        amount: parseFloat(amountInput.value),
        type: typeSelect.value
      };
      acc.transactions.push(t);
      saveAccounts();
      displayResults();
      transactionForm.reset();
    });
  }

  if (exportPDFBtn) {
    exportPDFBtn.addEventListener("click", () => {
      if (currentAccountIndex === null) return;
      let acc = accounts[currentAccountIndex];

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`${acc.name} (${acc.location}) Report`, 20, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);

      let startDate = startDateInput.value ? new Date(startDateInput.value) : null;
      let endDate = endDateInput.value ? new Date(endDateInput.value) : null;

      let y = 40;
      doc.text("Date | Description | Type | Amount", 20, y);
      y += 10;

      acc.transactions.forEach(t => {
        let d = new Date(t.date);
        if (startDate && d < startDate) return;
        if (endDate && d > endDate) return;

        doc.text(`${t.date} | ${t.description} | ${t.type} | ${formatCurrency(t.amount)}`, 20, y);
        y += 10;
        if (y > 270) { doc.addPage(); y = 20; }
      });

      let income = acc.transactions.filter(t => t.type === "income").reduce((a, b) => a + b.amount, 0);
      let expense = acc.transactions.filter(t => t.type === "expense").reduce((a, b) => a + b.amount, 0);
      let profit = income - expense;

      y += 10;
      doc.text(`Total Income: ${formatCurrency(income)}`, 20, y); y += 10;
      doc.text(`Total Expense: ${formatCurrency(expense)}`, 20, y); y += 10;
      doc.text(`Final Profit/Loss: ${formatCurrency(profit)}`, 20, y);

      doc.save("Farm_Report.pdf");
    });
  }

  // ==============================
  // LANGUAGE SWITCHER
  // ==============================
  function applyTranslations() {
    Object.keys(translations).forEach(key => {
      let el = document.getElementById(key);
      if (el) {
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
          el.placeholder = translations[key];
        } else {
          el.textContent = translations[key];
        }
      }
    });
  }

  async function loadLanguage(lang) {
    try {
      let res = await fetch(`${lang}.json`);
      translations = await res.json();
      currentLang = lang;
      applyTranslations();
      displayResults();
    } catch (err) {
      console.error("Error loading language:", err);
    }
  }

  if (langSelect) {
    langSelect.addEventListener("change", e => {
      loadLanguage(e.target.value);
    });
  }

  // ==============================
  // GLOBAL FUNCTIONS FOR EDIT/DELETE
  // ==============================
  window.editTransaction = function (idx) {
    let acc = accounts[currentAccountIndex];
    let t = acc.transactions[idx];
    dateInput.value = t.date;
    descriptionInput.value = t.description;
    amountInput.value = t.amount;
    typeSelect.value = t.type;
    acc.transactions.splice(idx, 1);
    saveAccounts();
    displayResults();
  };

  window.deleteTransaction = function (idx) {
    let acc = accounts[currentAccountIndex];
    acc.transactions.splice(idx, 1);
    saveAccounts();
    displayResults();
  };

  // ==============================
  // INIT
  // ==============================
  loadAccounts();
  loadLanguage("en");
});
