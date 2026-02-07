let data = {}; // Dynamic schedule JSON
let userRole = '';

const roleDropdown = document.getElementById('roleDropdown');
const confirmRole = document.getElementById('confirmRole');
const mainForm = document.getElementById('mainForm');
const uploadSection = document.getElementById('uploadSection');
const uploadExcel = document.getElementById('uploadExcel');
const dateSelect = document.getElementById('dateSelect');
const generateBtn = document.getElementById('generateBtn');
const briefingPopup = document.getElementById('briefingPopup');
const briefingText = document.getElementById('briefingText');
const copyBtn = document.getElementById('copyBtn');
const closeBtn = document.getElementById('closeBtn');

// ------------------- ROLE SELECTION -------------------
confirmRole.onclick = () => {
    const selected = roleDropdown.value;
    if (!selected) return alert('Please select a role');
    userRole = selected;
    uploadSection.style.display = userRole === 'manager' ? 'block' : 'none';
    document.getElementById('roleSelect').style.display = 'none';
    mainForm.style.display = 'block';
};

// ------------------- EXCEL UPLOAD -------------------
uploadExcel.addEventListener('change', (e) => {
    if (userRole !== 'manager') return alert('Only manager can upload schedule');
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const dataArr = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(dataArr, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Convert to JSON grouped by date and sala/bar
        data = {};
        json.forEach(row => {
            const date = row.Date;
            const pos = row.Position.toLowerCase();
            if (!data[date]) data[date] = { sala: [], bar: [] };

            const staffObj = {
                name: row.Name,
                entry: row.Entry,
                exit: row.Exit,
                position: row.Position
            };

            if (pos === 'bar') data[date].bar.push(staffObj);
            else data[date].sala.push(staffObj);
        });

        populateDates();
        alert('Schedule uploaded successfully!');
    };
    reader.readAsArrayBuffer(file);
});

// ------------------- POPULATE DATES -------------------
function populateDates() {
    dateSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.textContent = 'Choose date';
    placeholder.value = '';
    placeholder.selected = true;
    placeholder.disabled = true;
    dateSelect.appendChild(placeholder);

    Object.keys(data).forEach(date => {
        const opt = document.createElement('option');
        opt.value = date;
        opt.textContent = date;
        dateSelect.appendChild(opt);
    });
}

// ------------------- ROUND TIME -------------------
function roundTime(t){return t;} // keep HH:MM

// ------------------- GENERATE BRIEFING -------------------
function generateBriefing(date){
    const dayData = data[date];
    if(!dayData) return "No data for this date";

    const sala = dayData.sala || [];
    const bar = dayData.bar || [];

    // PORTA
    let porta = sala.find(s => s.position.toLowerCase() === 'porta') 
                 || sala.reduce((earliest,s)=>!earliest||s.entry<earliest.entry?s:earliest,null);

    // BAR OPEN
    const barStaff = bar.filter(b=>b.position.toLowerCase()==='bar');
    const barSorted = [...barStaff].sort((a,b)=>a.entry.localeCompare(b.entry));
    let barLines = [];
    if(barSorted[0]) barLines.push(`${barSorted[0].entry} Abertura Sala/Bar: ${barSorted[0].name}`);
    if(barSorted[0]) barLines.push(`${barSorted[0].entry} Bar A: ${barSorted[0].name}`);
    if(barSorted[1]) barLines.push(`${barSorted[1].entry} Bar B: ${barSorted[1].name}`);
    if(barSorted[2]) barLines.push(`${barSorted[2].entry} Bar C: ${barSorted[2].name}`);
    if(barSorted[3]) barLines.push(`${barSorted[3].entry} Bar D: ${barSorted[3].name}`);

    // SELLERS & RUNNERS
    const runners = sala.filter(s=>s.position.toLowerCase()==='runner');
    const sellers = sala.filter(s=>s.position.toLowerCase()==='seller');
    let sellerLines = sellers.sort((a,b)=>a.entry.localeCompare(b.entry))
        .map((s,i)=>`${s.entry} Seller ${String.fromCharCode(65+i)}: ${s.name}`);
    let runnerLine = runners.map(r=>r.name).join(', ') || 'Todos';

    // HACCP BAR
    const barExit = [...barStaff].sort((a,b)=>a.exit.localeCompare(b.exit));
    let barHACCP = [];
    if(barExit[0]) barHACCP.push(`${barExit[0].exit} Preparações Bar: ${barExit[0].name}`);
    if(barExit.length>=3) barHACCP.push(`${barExit[1].exit} Reposição Bar: ${barExit[1].name}`);
    else if(barExit[0]) barHACCP.push(`${barExit[0].exit} Reposição Bar: ${barExit[0].name}`);
    if(barExit.at(-1)){
        barHACCP.push(`${barExit.at(-1).exit} Limpeza Máquina / Reposição de Leites: ${barExit.at(-1).name}`);
        barHACCP.push(`${barExit.at(-1).exit} Fecho Bar: ${barExit.at(-1).name}`);
    }

    // HACCP SALA
    const salaSortedExit = [...sala].sort((a,b)=>{
        const toMin=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;}
        return toMin(a.exit)-toMin(b.exit);
    });
    let salaHACCPLines=[];
    if(salaSortedExit.length===1){
        const s=salaSortedExit[0];
        salaHACCPLines.push(`${s.exit} Fecho da sala de cima: ${s.name}`);
        salaHACCPLines.push(`${s.exit} Limpeza e reposição aparador/ cadeira de bebés: ${s.name}`);
        salaHACCPLines.push(`${s.exit} Repor papel (casa de banho): ${s.name}`);
        salaHACCPLines.push(`${s.exit} Limpeza casa de banho (clientes e staff): ${s.name}`);
        salaHACCPLines.push(`${s.exit} Limpeza vidros e Espelhos: ${s.name}`);
        salaHACCPLines.push(`${s.exit} Fecho da sala: ${s.name}`);
    }else if(salaSortedExit.length===2){
        const first=salaSortedExit[0];
        const last=salaSortedExit[1];
        salaHACCPLines.push(`${first.exit} Fecho da sala de cima: ${first.name}`);
        salaHACCPLines.push(`${first.exit} Limpeza e reposição aparador/ cadeira de bebés: ${first.name}`);
        salaHACCPLines.push(`${first.exit} Repor papel (casa de banho): ${first.name}`);
        salaHACCPLines.push(`${first.exit} Limpeza casa de banho (clientes e staff): ${first.name}`);
        salaHACCPLines.push(`${last.exit} Limpeza vidros e Espelhos: ${last.name}`);
        salaHACCPLines.push(`${last.exit} Fecho da sala: ${last.name}`);
    }else if(salaSortedExit.length>=3){
        const first=salaSortedExit[0];
        const second=salaSortedExit[1];
        const last=salaSortedExit.at(-1);
        salaHACCPLines.push(`${first.exit} Fecho da sala de cima: ${first.name}`);
        salaHACCPLines.push(`${first.exit} Limpeza e reposição aparador/ cadeira de bebés: ${first.name}`);
        salaHACCPLines.push(`${first.exit} Repor papel (casa de banho): ${first.name}`);
        salaHACCPLines.push(`${second.exit} Limpeza casa de banho (clientes e staff): ${second.name}`);
        salaHACCPLines.push(`${last.exit} Limpeza vidros e Espelhos: ${last.name}`);
        salaHACCPLines.push(`${last.exit} Fecho da sala: ${last.name}`);
    }

    // FECHO DE CAIXA
    const fechoPriority=['carlos','prabhu','ana'];
    let fechoPerson=fechoPriority.find(p=>barStaff.some(b=>b.name.toLowerCase()===p)) || barExit.at(-1)?.name;
    const fechoLine=`${barExit.at(-1)?.exit} Fecho de Caixa: ${fechoPerson}`;

    // COMPOSE BRIEFING
    let briefing=
`Bom dia a todos!

========================
BRIEFING – ${date}
========================

${porta.entry} Porta: ${porta.name}

BAR:
${barLines.join("\n")}

⸻⸻⸻⸻

‼️ Loiça é responsabilidade de todos.
NÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO
——————————————

SELLERS:
${sellerLines.join("\n")}

⚠ Pastéis de Nata – Cada Seller na sua secção ⚠
——————————————
Seller A: Mesas 20 - 30
Seller B & C: Mesas 1 - 12
——————————————

Runner: ${runnerLine}

HACCP / LIMPEZA BAR:
${barHACCP.join("\n")}

HACCP / LIMPEZA SALA:
${salaHACCPLines.join("\n")}

${fechoLine}`;

    return briefing;
}

// ------------------- UI BUTTONS -------------------
generateBtn.onclick = () => {
    const date = dateSelect.value;
    if(!date) return alert('Please choose a date');
    briefingText.textContent = generateBriefing(date);
    briefingPopup.style.display = 'flex';
};
closeBtn.onclick = () => briefingPopup.style.display = 'none';
copyBtn.onclick = () => navigator.clipboard.writeText(briefingText.textContent);
