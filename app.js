let currentLang='id';
const langSelect=document.getElementById('langSelect');
let translations={};

async function loadLang(lang){
    const res=await fetch(`lang/${lang}.json`);
    translations[lang]=await res.json();
    applyTranslations(lang);
    currentLang=lang;
}

function applyTranslations(lang){
    const t=translations[lang];
    document.getElementById('title').innerText=t.title;
    document.getElementById('labelLang').innerText=t.labelLang;
    document.getElementById('profitTitle').innerText=t.profitTitle;
    document.getElementById('weeklyProfitTitle').innerText=t.weeklyProfitTitle;
    document.getElementById('monthlyProfitTitle').innerText=t.monthlyProfitTitle;
    document.getElementById('saveBtn').innerText=t.saveBtn;
    document.getElementById('exportPDFBtn').innerText=t.exportPDFBtn;
    document.getElementById('cropName').placeholder=t.cropName;
    document.getElementById('cropType').placeholder=t.cropType;
    document.getElementById('seedPrice').placeholder=t.seedPrice;
    document.getElementById('travelCost').placeholder=t.travelCost;
    document.getElementById('harvestAmount').placeholder=t.harvestAmount;
    document.getElementById('harvestPrice').placeholder=t.harvestPrice;
    document.getElementById('plantingDate').placeholder=t.plantingDate;
}

langSelect.addEventListener('change',(e)=>loadLang(e.target.value));
loadLang(currentLang);

// CRUD
const saveBtn=document.getElementById('saveBtn');
const profitResults=document.getElementById('profitResults');
const exportPDFBtn=document.getElementById('exportPDFBtn');
let editingIndex=null;

function calculateProfit(seedPrice,travelCost,harvestAmount,harvestPrice){
    return parseFloat(harvestAmount)*parseFloat(harvestPrice)- (parseFloat(seedPrice)+parseFloat(travelCost));
}

function getData(){return JSON.parse(localStorage.getItem('farmData')||'[]');}
function saveDataToStorage(data){localStorage.setItem('farmData',JSON.stringify(data));}

function displayResults(){
    const data=getData();
    const grouped={};
    data.forEach(item=>{
        if(!grouped[item.cropType]) grouped[item.cropType]=[];
        grouped[item.cropType].push(item);
    });
    profitResults.innerHTML='';
    for(const type in grouped){
        const header=document.createElement('h3');
        header.innerText=`${type} (${grouped[type].length} entries)`;
        profitResults.appendChild(header);
        grouped[type].forEach((item,idx)=>{
            const div=document.createElement('div');
            div.classList.add('result-item');
            div.innerHTML=`
            <span>${idx+1}. ${item.cropName} - ${item.profit} IDR (Planted: ${item.plantingDate})</span>
            <div>
                <button class="editBtn" onclick="editData('${item.timestamp}')">${translations[currentLang].editBtn}</button>
                <button onclick="deleteData('${item.timestamp}')">${translations[currentLang].deleteBtn}</button>
            </div>`;
            profitResults.appendChild(div);
        });
    }
    updateCharts();
}

function saveData(){
    const cropName=document.getElementById('cropName').value;
    const cropType=document.getElementById('cropType').value;
    const seedPrice=document.getElementById('seedPrice').value;
    const travelCost=document.getElementById('travelCost').value;
    const harvestAmount=document.getElementById('harvestAmount').value;
    const harvestPrice=document.getElementById('harvestPrice').value;
    const plantingDate=document.getElementById('plantingDate').value;

    if(!cropName||!cropType||!seedPrice||!travelCost||!harvestAmount||!harvestPrice||!plantingDate){
        return alert('Lengkapi semua data!');
    }

    const profit=calculateProfit(seedPrice,travelCost,harvestAmount,harvestPrice);
    let farmData=getData();
    const record={cropName,cropType,seedPrice,travelCost,harvestAmount,harvestPrice,plantingDate,profit,timestamp:new Date().getTime()};

    if(editingIndex!==null){
        const idx=farmData.findIndex(r=>r.timestamp===editingIndex);
        if(idx>-1) farmData[idx]=record;
        editingIndex=null;
    }else{
        farmData.push(record);
    }

    saveDataToStorage(farmData);
    displayResults();
    clearForm();
}

function editData(timestamp){
    const data=getData();
    const item=data.find(r=>r.timestamp==timestamp);
    if(!item) return;
    document.getElementById('cropName').value=item.cropName;
    document.getElementById('cropType').value=item.cropType;
    document.getElementById('seedPrice').value=item.seedPrice;
    document.getElementById('travelCost').value=item.travelCost;
    document.getElementById('harvestAmount').value=item.harvestAmount;
    document.getElementById('harvestPrice').value=item.harvestPrice;
    document.getElementById('plantingDate').value=item.plantingDate;
    editingIndex=timestamp;
}

function deleteData(timestamp){
    let data=getData();
    data=data.filter(r=>r.timestamp!=timestamp);
    saveDataToStorage(data);
    displayResults();
}

function clearForm(){
    document.getElementById('cropName').value='';
    document.getElementById('cropType').value='';
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
exportPDFBtn.addEventListener('click',()=>{
    const data=getData();
    if(data.length===0) return alert('No data to export');
    const grouped={};
    data.forEach(item=>{
        if(!grouped[item.cropType]) grouped[item.cropType]=[];
        grouped[item.cropType].push(item);
    });
    const doc=new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(0,255,255);
    doc.text('Farm Profit Report',105,20,null,null,'center');
    doc.setFontSize(12);
    let y=30;
    for(const type in grouped){
        doc.setTextColor(0,255,255);
        doc.text(type,10,y);
        y+=6;
        grouped[type].forEach((item,idx)=>{
            doc.setTextColor(255,255,255);
            doc.text(`${idx+1}. ${item.cropName} | Profit: ${item.profit} IDR | Planted: ${item.plantingDate}`,10,y);
            y+=6;
            if(y>280){doc.addPage(); y=20;}
        });
        y+=4;
    }
    doc.save('Farm_Profit_Report.pdf');
});

saveBtn.addEventListener('click',saveData);
displayResults();
