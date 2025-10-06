let currentLang = 'id';
const langSelect = document.getElementById('langSelect');
let translations = {};

// Deklarasi chart global di atas agar aman digunakan
let weeklyChart = null;
let monthlyChart = null;

// Load language
async function loadLang(lang) {
    const res = await fetch(`lang/${lang}.json`);
    translations[lang] = await res.json();
    applyTranslations(lang);
    currentLang = lang;
}

function applyTranslations(lang) {
    const t = translations[lang];
    document.getElementById('title').innerText = t.title;
    document.getElementById('labelLang').innerText = t.labelLang;
    document.getElementById('accountSectionTitle').innerText = t.accountSectionTitle;
    document.getElementById('selectAccountTitle').innerText = t.selectAccountTitle;
    document.getElementById('transactionSectionTitle').innerText = t.transactionSectionTitle;
    document.getElementById('profitTitle').innerText = t.profitTitle;
    document.getElementById('weeklyProfitTitle').innerText = t.weeklyProfitTitle;
    document.getElementById('monthlyProfitTitle').innerText = t.monthlyProfitTitle;
    document.getElementById('createAccountBtn').innerText = t.createAccountBtn;
    document.getElementById('addTransactionBtn').innerText = t.addTransactionBtn;
    document.getElementById('exportPDFBtn').innerText = t.exportPDFBtn;
    document.getElementById('cropName').placeholder = t.cropName;
    document.getElementById('location').placeholder = t.location;
    document.getElementById('description').placeholder = t.description;
    document.getElementById('amount').placeholder = t.amount;
}

langSelect.addEventListener('change', (e) => loadLang(e.target.value));
loadLang(currentLang);

// LocalStorage helpers
function getAccounts() { return JSON.parse(localStorage.getItem('accounts') || '[]'); }
function saveAccounts(data) { localStorage.setItem('accounts', JSON.stringify(data)); }

const accountSelect = document.getElementById('accountSelect');
const createAccountBtn = document.getElementById('createAccountBtn');
const addTransactionBtn = document.getElementById('addTransactionBtn');
const accountResults = document.getElementById('accountResults');
const exportPDFBtn = document.getElementById('exportPDFBtn');

let editingTransaction = null;

// Create account
createAccountBtn.addEventListener('click', () => {
    const cropName = document.getElementById('cropName').value.trim();
    const location = document.getElementById('location').value.trim();
    if (!cropName || !location) return alert('Lengkapi nama tanaman & lokasi');

    let accounts = getAccounts();
    if (accounts.find(a => a.cropName === cropName && a.location === location)) {
        alert('Akun sudah ada'); return;
    }

    accounts.push({ cropName, location, transactions: [] });
    saveAccounts(accounts);
    loadAccounts();

    // Pilih akun baru secara otomatis
    accountSelect.value = accounts.length - 1;
});

// Load account dropdown
function loadAccounts() {
    const accounts = getAccounts();
    accountSelect.innerHTML = '';
    accounts.forEach((a, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.text = `${a.cropName} - ${a.location}`;
        accountSelect.add(opt);
    });
    displayResults();
}
loadAccounts();

// Add transaction
addTransactionBtn.addEventListener('click', () => {
    const idx = parseInt(accountSelect.value);
    if (isNaN(idx) || idx < 0 || idx >= getAccounts().length) return alert('Pilih akun dulu');

    const type = document.getElementById('transactionType').value;
    const description = document.getElementById('description').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    if (!description || !amount || !date) return alert('Lengkapi semua transaksi');

    const accounts = getAccounts();
    if (editingTransaction) {
        const { accIdx, txIdx } = editingTransaction;
        accounts[accIdx].transactions[txIdx] = { type, description, amount, date };
        editingTransaction = null;
    } else {
        accounts[idx].transactions.push({ type, description, amount, date });
    }
    saveAccounts(accounts);
    displayResults();
    clearTransactionForm();
});

// Display results
function displayResults() {
    const accounts = getAccounts();
    accountResults.innerHTML = '';

    accounts.forEach((a, accIdx) => {
        let profit = a.transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

        const header = document.createElement('h3');
        header.innerText = `${a.cropName} - ${a.location} | Profit: ${profit} IDR`;
        accountResults.appendChild(header);

        if (a.transactions.length === 0) {
            const p = document.createElement('p');
            p.innerText = 'Belum ada transaksi';
            accountResults.appendChild(p);
        } else {
            a.transactions.forEach((t, txIdx) => {
                const div = document.createElement('div');
                div.classList.add('result-item');
                div.innerHTML = `
                    <span>${t.date} | ${t.type} | ${t.description} | ${t.amount} IDR</span>
                    <div>
                        <button class="editBtn" onclick="editTransaction(${accIdx},${txIdx})">${translations[currentLang].editBtn}</button>
                        <button onclick="deleteTransaction(${accIdx},${txIdx})">${translations[currentLang].deleteBtn}</button>
                    </div>`;
                accountResults.appendChild(div);
            });
        }
    });

    updateCharts();
}

// Edit / Delete transaction
function editTransaction(accIdx, txIdx) {
    const accounts = getAccounts();
    const t = accounts[accIdx].transactions[txIdx];
    document.getElementById('transactionType').value = t.type;
    document.getElementById('description').value = t.description;
    document.getElementById('amount').value = t.amount;
    document.getElementById('date').value = t.date;
    editingTransaction = { accIdx, txIdx };
}

function deleteTransaction(accIdx, txIdx) {
    const accounts = getAccounts();
    accounts[accIdx].transactions.splice(txIdx, 1);
    saveAccounts(accounts);
    displayResults();
}

function clearTransactionForm() {
    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('date').value = '';
    editingTransaction = null;
}

// Charts
function updateCharts() {
    const accounts = getAccounts();
    const weeklyProfits = {}, monthlyProfits = {};

    accounts.forEach(a => {
        a.transactions.forEach(t => {
            const date = new Date(t.date);
            const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate() + 1)/7)}`;
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const amt = t.type === 'income' ? t.amount : -t.amount;
            weeklyProfits[weekKey] = (weeklyProfits[weekKey] || 0) + amt;
            monthlyProfits[monthKey] = (monthlyProfits[monthKey] || 0) + amt;
        });
    });

    const weeklyLabels = Object.keys(weeklyProfits).sort();
    const weeklyData = weeklyLabels.map(l => weeklyProfits[l]);
    const monthlyLabels = Object.keys(monthlyProfits).sort();
    const monthlyData = monthlyLabels.map(l => monthlyProfits[l]);

    if (weeklyChart) weeklyChart.destroy();
    if (monthlyChart) monthlyChart.destroy();

    weeklyChart = new Chart(document.getElementById('weeklyChart'), {
        type: 'bar',
        data: { labels: weeklyLabels, datasets: [{ label: 'Profit IDR', data: weeklyData, backgroundColor: '#0ff' }] }
    });

    monthlyChart = new Chart(document.getElementById('monthlyChart'), {
        type: 'bar',
        data: { labels: monthlyLabels, datasets: [{ label: 'Profit IDR', data: monthlyData, backgroundColor: '#ff0' }] }
    });
}

// Export PDF
const { jsPDF } = window.jspdf;
exportPDFBtn.addEventListener('click', () => {
    const accounts = getAccounts();
    if (accounts.length === 0) return alert('No data to export');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(0, 255, 255);
    doc.text('Farm Profit Report', 105, 20, null, null, 'center');
    doc.setFontSize(12);
    let y = 30;

    accounts.forEach(a => {
        let profit = a.transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
        doc.setTextColor(0, 255, 255);
        doc.text(`${a.cropName} - ${a.location} | Profit: ${profit} IDR`, 10, y);
        y += 6;

        a.transactions.forEach(t => {
            doc.setTextColor(255, 255, 255);
            doc.text(`${t.date} | ${t.type} | ${t.description} | ${t.amount} IDR`, 10, y);
            y += 6;
            if (y > 280) { doc.addPage(); y = 20; }
        });

        y += 4;
    });

    doc.save('Farm_Profit_Report.pdf');
});
