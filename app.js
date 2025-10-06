// ===== Farm Profit Tracker =====

// Local Storage Helpers
function getAccounts() {
    return JSON.parse(localStorage.getItem("accounts") || "[]");
}
function saveAccounts(accounts) {
    localStorage.setItem("accounts", JSON.stringify(accounts));
}

// Elements
const accountForm = document.getElementById("account-form");
const cropNameInput = document.getElementById("crop-name");
const locationInput = document.getElementById("location");
const accountsList = document.getElementById("accounts-list");
const transactionForm = document.getElementById("transaction-form");
const transactionAccount = document.getElementById("transaction-account");
const transactionType = document.getElementById("transaction-type");
const transactionAmount = document.getElementById("transaction-amount");
const transactionDescription = document.getElementById("transaction-description");
const transactionDate = document.getElementById("transaction-date");
const resultsContainer = document.getElementById("results-container");
const exportPDFBtn = document.getElementById("export-pdf");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");

// Charts
let weeklyChart = null;
let monthlyChart = null;

// ===== Create Account =====
accountForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const accounts = getAccounts();
    accounts.push({
        id: Date.now(),
        cropName: cropNameInput.value,
        location: locationInput.value,
        transactions: []
    });
    saveAccounts(accounts);
    cropNameInput.value = "";
    locationInput.value = "";
    loadAccounts();
});

// ===== Load Accounts =====
function loadAccounts() {
    const accounts = getAccounts();
    accountsList.innerHTML = "";
    transactionAccount.innerHTML = "";

    accounts.forEach(a => {
        // List display
        const li = document.createElement("li");
        li.textContent = `${a.cropName} - ${a.location}`;
        accountsList.appendChild(li);

        // Dropdown for transactions
        const option = document.createElement("option");
        option.value = a.id;
        option.textContent = `${a.cropName} - ${a.location}`;
        transactionAccount.appendChild(option);
    });

    displayResults();
}

// ===== Add Transaction =====
transactionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const accounts = getAccounts();
    const accId = parseInt(transactionAccount.value);
    const acc = accounts.find(a => a.id === accId);

    acc.transactions.push({
        id: Date.now(),
        type: transactionType.value,
        amount: parseFloat(transactionAmount.value),
        description: transactionDescription.value,
        date: transactionDate.value
    });

    saveAccounts(accounts);
    transactionAmount.value = "";
    transactionDescription.value = "";
    transactionDate.value = "";

    displayResults();
});

// ===== Display Results =====
function displayResults() {
    const accounts = getAccounts();
    resultsContainer.innerHTML = "";

    accounts.forEach(a => {
        const div = document.createElement("div");
        div.classList.add("account-result");

        let profit = a.transactions.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);

        div.innerHTML = `
            <h3>${a.cropName} - ${a.location}</h3>
            <p><strong>Total Profit/Loss:</strong> ${formatIDR(profit)}</p>
            <ul>
                ${a.transactions.map(t => `<li>${t.date} - ${t.type} - ${t.description}: ${formatIDR(t.amount)}</li>`).join("")}
            </ul>
        `;

        resultsContainer.appendChild(div);
    });

    updateCharts();
}

// ===== Charts =====
function updateCharts() {
    const accounts = getAccounts();
    const allTx = accounts.flatMap(a => a.transactions);

    // Group weekly
    const weekly = {};
    allTx.forEach(t => {
        const week = getWeek(new Date(t.date));
        weekly[week] = (weekly[week] || 0) + (t.type === "income" ? t.amount : -t.amount);
    });

    // Group monthly
    const monthly = {};
    allTx.forEach(t => {
        const month = t.date.slice(0, 7);
        monthly[month] = (monthly[month] || 0) + (t.type === "income" ? t.amount : -t.amount);
    });

    const ctxW = document.getElementById("weeklyChart").getContext("2d");
    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(ctxW, {
        type: "bar",
        data: {
            labels: Object.keys(weekly),
            datasets: [{
                label: "Weekly Profit/Loss",
                data: Object.values(weekly),
                backgroundColor: "#0ff"
            }]
        }
    });

    const ctxM = document.getElementById("monthlyChart").getContext("2d");
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctxM, {
        type: "line",
        data: {
            labels: Object.keys(monthly),
            datasets: [{
                label: "Monthly Profit/Loss",
                data: Object.values(monthly),
                borderColor: "#f0f",
                fill: false
            }]
        }
    });
}

// ===== Helpers =====
function getWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return "W" + Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatIDR(num) {
    return new Intl.NumberFormat("id-ID").format(num).replace(/\./g, ".").replace(",", ".") + ",- IDR";
}

// ===== Export PDF =====
const { jsPDF } = window.jspdf;
exportPDFBtn.addEventListener("click", () => {
    const accounts = getAccounts();
    if (accounts.length === 0) return alert("No data to export");

    const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value) : null;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Farm Profit Report", 105, 20, null, null, "center");
    doc.setFontSize(12);
    let y = 30;

    accounts.forEach(a => {
        let filteredTx = a.transactions.filter(t => {
            const tDate = new Date(t.date);
            if (startDate && tDate < startDate) return false;
            if (endDate && tDate > endDate) return false;
            return true;
        });

        if (filteredTx.length === 0) return;

        let profit = filteredTx.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);

        doc.setFontSize(14);
        doc.text(`${a.cropName} - ${a.location}`, 10, y);
        y += 8;

        // Table Header
        doc.setFontSize(11);
        doc.text("Date", 10, y);
        doc.text("Type", 40, y);
        doc.text("Description", 80, y);
        doc.text("Amount", 170, y, { align: "right" });
        y += 6;
        doc.line(10, y, 200, y);
        y += 4;

        // Table Rows
        filteredTx.forEach(t => {
            if (y > 270) { doc.addPage(); y = 20; }

            doc.text(t.date, 10, y);
            doc.text(t.type === "income" ? "Income" : "Expense", 40, y);
            doc.text(t.description, 80, y);
            doc.text(formatIDR(t.amount), 170, y, { align: "right" });
            y += 6;
        });

        y += 4;
        doc.line(10, y, 200, y);
        y += 6;

        doc.setFontSize(12);
        doc.text(`Total Profit/Loss: ${formatIDR(profit)}`, 10, y);
        y += 12;
    });

    doc.save("Farm_Profit_Report.pdf");
});

// ===== Init =====
loadAccounts();
