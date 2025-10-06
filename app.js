let currentLang = 'id';
const langSelect = document.getElementById('langSelect');
const elementsToTranslate = {
    title: document.getElementById('title'),
    labelLang: document.getElementById('labelLang'),
    profitTitle: document.getElementById('profitTitle'),
    weeklyProfitTitle: document.getElementById('weeklyProfitTitle'),
    monthlyProfitTitle: document.getElementById('monthlyProfitTitle'),
    saveBtn: document.getElementById('saveBtn')
};

async function loadLang(lang){
    const res = await fetch(`lang/${lang}.json`);
    const data = await res.json();
    for(const key in elementsToTranslate){
        if(data[key]) elementsToTranslate[key].innerText = data[key];
    }
    currentLang = lang;
}
langSelect.addEventListener('change',(e)=>loadLang(e.target.value));
loadLang(currentLang);

// CRUD
const saveBtn = document.getElementById('saveBtn');
const profitResults = document.getElementById('profitResults');
let editingIndex = null;

function calculateProfit(seedPrice, travelCost, harvestAmount, harvestPrice){
    const totalCost = parseFloat(seedPrice)+parseFloat(travelCost);
    const totalRevenue = parseFloat(harvestAmount)*parseFloat(harvestPrice);
    return totalRevenue-totalCost;
}

function getData(){return JSON.parse(localStorage.getItem('farmData')||'[]');}
function saveDataToStorage(data){localStorage.setItem('farmData',JSON.stringify(data));}

function displayResults(){
    const data = getData();
    profitResults.innerHTML='';
    data.forEach((item,idx)=>{
        const div=document.createElement('div');
        div.classList.add('result-item');
        div.innerHTML=`
        <span>${idx+1}. ${item.cropName} - ${item.profit} IDR (Planted: ${item.plantingDate})</span>
        <div>
            <button class="editBtn" onclick="editData(${idx})">Edit</button>
            <button onclick="deleteData(${idx})">Hapus</button>
        </div>`;
        profitResults.appendChild(div);
    });
    updateCharts();
}

function saveData(){
    const cropName=document.getElementById('cropName').value;
    const seedPrice=document.getElementById('seedPrice').value;
    const travelCost=document.getElementById('travelCost').value;
    const harvestAmount=document.getElementById('harvestAmount').value;
    const harvestPrice=document.getElementById('harvestPrice').value;
    const plantingDate=document.getElementById('plantingDate').value;
    if(!cropName||!seedPrice||!travelCost||!harvestAmount||!harvestPrice||!plantingDate)
        return alert('Lengkapi semua data');
    const profit=calculateProfit(seedPrice,travelCost,harvestAmount,harvestPrice);
    let farmData=getData();
    const record={cropName,seedPrice,travelCost,harvestAmount,harvestPrice,plantingDate,profit,timestamp:new Date().toISOString()};
    if(editingIndex!==null){farmData[editingIndex]=record; editingIndex=null;}
    else farmData.push(record);
    saveDataToStorage(farmData);
    displayResults();
    clearForm();
}

function editData(index){
    const data=getData()[index];
    document.getElementById('cropName').value=data.cropName;
    document.getElementById('seedPrice').value=data.seedPrice;
    document.getElementById('travelCost').value=data.travelCost;
    document.getElementById('harvestAmount').value=data.harvestAmount;
    document.getElementById('harvestPrice').value=data.harvestPrice;
    document.getElementById('plantingDate').value=data.plantingDate;
    editingIndex=index;
}

function deleteData(index){
    let data=getData();
    data.splice(index,1);
    saveDataToStorage(data);
    displayResults();
}

function clearForm(){
    document.getElementById('cropName').value='';
    document.getElementById('seedPrice').value='';
    document.getElementById('travelCost').value='';
    document.getElementById('harvestAmount').value='';
    document.getElementById('harvestPrice').value='';
    document.getElementById('plantingDate').value='';
}

// Charts
let weeklyChart,monthlyChart;
function updateCharts(){
    const data=getData();
    const weeklyProfits={},monthlyProfits={};
    data.forEach(item=>{
        const date=new Date(item.plantingDate);
        const weekKey=`${date.getFullYear()}-W${Math.ceil((date.getDate()+1)/7)}`;
        const monthKey=`${date.getFullYear()}-${date.getMonth()+1}`;
        weeklyProfits[weekKey]=(weeklyProfits[weekKey]||0)+item.profit;
        monthlyProfits[monthKey]=(monthlyProfits[monthKey]||0)+item.profit;
    });
    const weeklyLabels=Object.keys(weeklyProfits).sort();
    const weeklyData=weeklyLabels.map(l=>weeklyProfits[l]);
    const monthlyLabels=Object.keys(monthlyProfits).sort();
    const monthlyData=monthlyLabels.map(l=>monthlyProfits[l]);
    if(weeklyChart) weeklyChart.destroy();
    if(monthlyChart) monthlyChart.destroy();
    weeklyChart=new Chart(document.getElementById('weeklyChart'),{
        type:'bar',
        data:{labels:weeklyLabels,datasets:[{label:'Profit IDR',data:weeklyData,backgroundColor:'#0ff'}]}
    });
    monthlyChart=new Chart(document.getElementById('monthlyChart'),{
        type:'bar',
        data:{labels:monthlyLabels,datasets:[{label:'Profit IDR',data:monthlyData,backgroundColor:'#ff0'}]}
    });
}

// Export PDF
const { jsPDF } = window.jspdf;
const exportPDFBtn=document.getElementById('exportPDFBtn');
exportPDFBtn.addEventListener('click',()=>{
    const data=getData();
    if(data.length===0) return alert('No data to export');
    const doc=new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(0,255,255);
    doc.text('Farm Profit Report',105,20,null,null,'center');
    doc.setFontSize(12);
    doc.setTextColor(255,255,255);
    let y=30;
    data.forEach((item,idx)=>{
        doc.text(`${idx+1}. ${item.cropName}`,10,y);
        doc.text(`Seed Price: ${item.seedPrice} | Travel Cost: ${item.travelCost}`,10,y+6);
        doc.text(`Harvest: ${item.harvestAmount}Kg x ${item.harvestPrice} = Profit ${item.profit} IDR`,10,y+12);
        doc.text(`Planted on: ${item.plantingDate}`,10,y+18);
        y+=26;
        if(y>280){doc.addPage(); y=20;}
    });
    doc.save('Farm_Profit_Report.pdf');
});

saveBtn.addEventListener('click',saveData);
displayResults();
