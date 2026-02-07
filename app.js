// ---------- VARIABLES ----------
let data = {};

// ---------- FETCH JSON ----------
fetch('data.json')
  .then(res => res.json())
  .then(json => {
    data = json;
    populateDates();
  })
  .catch(err => {
    console.error('Failed to load data.json', err);
    alert('Failed to load data.json');
  });

// ---------- POPULATE DATE DROPDOWN ----------
function populateDates() {
    const dateSelect = document.getElementById('dateSelect');
    dateSelect.innerHTML = '';

    Object.keys(data).forEach(date => {
        const opt = document.createElement('option');
        opt.value = date;
        opt.textContent = date;
        dateSelect.appendChild(opt);
    });

    if (dateSelect.options.length > 0) {
        dateSelect.selectedIndex = 0;
    }
}

// ---------- ROUND TIME ----------
function roundTime(timeStr) {
    return timeStr; // already HH:MM
}

// ---------- GENERATE BRIEFING ----------
function generateBriefing(date) {
    const dayData = data[date];
    if (!dayData) return 'No data for this date';

    const sala = dayData.sala || [];
    const bar = dayData.bar || [];

    // ---------- PORTA ----------
    let porta = sala.find(s => s.name.toLowerCase() === 'ana')
        || sala.reduce((earliest, s) => !earliest || s.entry < earliest.entry ? s : earliest, null);

    // ---------- BAR OPEN ----------
    const barSorted = [...bar].sort((a,b)=>a.entry.localeCompare(b.entry));
    let barLines = [];
    if (barSorted[0]) barLines.push(`${barSorted[0].entry} Abertura Sala/Bar: ${barSorted[0].name}`);
    if (barSorted[0]) barLines.push(`${barSorted[0].entry} Bar A: ${barSorted[0].name}`);
    if (barSorted[1]) barLines.push(`${barSorted[1].entry} Bar B: ${barSorted[1].name}`);
    if (barSorted[2]) barLines.push(`${barSorted[2].entry} Bar C: ${barSorted[2].name}`);
    if (barSorted[3]) barLines.push(`${barSorted[3].entry} Bar D: ${barSorted[3].name}`);

    // ---------- SELLERS ----------
    const salaNoAna = sala.filter(s => s.name.toLowerCase() !== 'ana');
    const julieta = salaNoAna.find(s => s.name.toLowerCase() === 'julieta');
    const otherSala = salaNoAna.filter(s => s.name.toLowerCase() !== 'julieta');

    let sellers = [];
    let runnerLine = '';

    if (salaNoAna.length >= 3 && julieta) {
        sellers = otherSala.sort((a,b)=>a.entry.localeCompare(b.entry));
        runnerLine = 'Runner A e B: Julieta';
    } else {
        sellers = salaNoAna.sort((a,b)=>a.entry.localeCompare(b.entry));
        runnerLine = 'Runner A e B: Todos';
    }

    const sellerLines = sellers.map((s,i)=>`${s.entry} Seller ${String.fromCharCode(65+i)}: ${s.name}`);

    // ---------- HACCP BAR ----------
    const barExit = [...bar].sort((a,b)=>a.exit.localeCompare(b.exit));
    let barHACCP = [];

    if (barExit[0]) barHACCP.push(`${barExit[0].exit} Preparações Bar: ${barExit[0].name}`);
    if (barExit.length >= 3)
        barHACCP.push(`${barExit[1].exit} Reposição Bar: ${barExit[1].name}`);
    else if (barExit[0])
        barHACCP.push(`${barExit[0].exit} Reposição Bar: ${barExit[0].name}`);

    if (barExit.at(-1)) {
        barHACCP.push(`${barExit.at(-1).exit} Limpeza Máquina / Reposição de Leites: ${barExit.at(-1).name}`);
        barHACCP.push(`${barExit.at(-1).exit} Fecho Bar: ${barExit.at(-1).name}`);
    }

    // ---------- HACCP SALA ----------
    const salaSortedExit = [...salaNoAna].sort((a,b)=>a.exit.localeCompare(b.exit));
    let salaHACCPLines = [];

    if (salaSortedExit.length === 1) {
        const s = salaSortedExit[0];
        salaHACCPLines.push(`${s.exit} Fecho da sala de cima: ${s.name}`);
        salaHACCPLines.push(`${s.exit} Limpeza e reposição aparador/ cadeira de bebés: ${s.name}`);
        salaHACCPLines.push(`${s.exit} Repor papel (casa de banho): ${s.name}`);
        salaHACCPLines.push(`${s.exit} Limpeza casa de banho (clientes e staff): ${s.name}`);
        salaHACCPLines.push(`${s.exit} Limpeza vidros e Espelhos: ${s.name}`);
        salaHACCPLines.push(`${s.exit} Fecho da sala: ${s.name}`);
    } else if (salaSortedExit.length === 2) {
        const first = salaSortedExit[0];
        const second = salaSortedExit[1];
        salaHACCPLines.push(`${first.exit} Fecho da sala de cima: ${first.name}`);
        salaHACCPLines.push(`${first.exit} Limpeza e reposição aparador/ cadeira de bebés: ${first.name}`);
        salaHACCPLines.push(`${first.exit} Repor papel (casa de banho): ${first.name}`);
        salaHACCPLines.push(`${second.exit} Limpeza casa de banho (clientes e staff): ${second.name}`);
        salaHACCPLines.push(`${second.exit} Limpeza vidros e Espelhos: ${second.name}`);
        salaHACCPLines.push(`${second.exit} Fecho da sala: ${second.name}`);
    } else if (salaSortedExit.length >= 3) {
        const first = salaSortedExit[0];
        const second = salaSortedExit[1];
        const last = salaSortedExit[salaSortedExit.length-1];
        salaHACCPLines.push(`${first.exit} Fecho da sala de cima: ${first.name}`);
        salaHACCPLines.push(`${first.exit} Limpeza e reposição aparador/ cadeira de bebés: ${first.name}`);
        salaHACCPLines.push(`${first.exit} Repor papel (casa de banho): ${first.name}`);
        salaHACCPLines.push(`${second.exit} Limpeza casa de banho (clientes e staff): ${second.name}`);
        salaHACCPLines.push(`${last.exit} Limpeza vidros e Espelhos: ${last.name}`);
        salaHACCPLines.push(`${last.exit} Fecho da sala: ${last.name}`);
    }

    // ---------- FECHO DE CAIXA ----------
    const fechoPriority = ['carlos','prabhu','ana'];
    let fechoPerson = fechoPriority.find(p => bar.some(b=>b.name.toLowerCase()===p)) || barExit.at(-1)?.name;
    const fechoLine = `${barExit.at(-1)?.exit} Fecho de Caixa: ${fechoPerson}`;

    // ---------- COMPOSE BRIEFING ----------
    let briefing = 
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

${runnerLine}

HACCP / LIMPEZA BAR:
${barHACCP.join("\n")}

HACCP / LIMPEZA SALA:
${salaHACCPLines.join("\n")}

${fechoLine}
`;

    return briefing;
}

// ---------- UI ----------
const generateBtn = document.getElementById('generateBtn');
const dateSelect = document.getElementById('dateSelect');
const briefingPopup = document.getElementById('briefingPopup');
const briefingText = document.getElementById('briefingText');
const copyBtn = document.getElementById('copyBtn');
const closeBtn = document.getElementById('closeBtn');

generateBtn.onclick = () => {
    const date = dateSelect.value;
    if (!date) return;
    briefingText.textContent = generateBriefing(date);
    briefingPopup.style.display = 'flex';
};

closeBtn.onclick = () => briefingPopup.style.display = 'none';
copyBtn.onclick = () => navigator.clipboard.writeText(briefingText.textContent);
