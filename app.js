const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "RUNNER": 6, "STAFF": 7 };

// --- INITIALIZATION ---

async function loadData() {
    const icons = document.querySelectorAll('.sync-small');
    icons.forEach(i => i.classList.add('spinning'));
    const startTime = Date.now();

    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true, header: false, skipEmptyLines: true,
        complete: function(results) {
            staffMap = {}; 
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const rawName = row[0].toString().toLowerCase().trim();
                const area = row[1] ? row[1].toString().trim() : "Sala";
                const pos = row[2] ? row[2].toString().trim().toUpperCase() : "STAFF";
                const alias = row[3] ? row[3].toString().trim() : row[0].trim();
                staffMap[rawName] = { 
                    alias: alias, 
                    area: area.toLowerCase().includes('bar') ? 'Bar' : 'Sala', 
                    position: pos, 
                    priority: POSITION_ORDER[pos] || 99 
                };
            });
            loadSchedule(icons, startTime);
        }
    });
}

function loadSchedule(icons, startTime) {
    Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
        download: true, header: false, skipEmptyLines: true,
        complete: function(results) {
            const dates = {}; 
            const rows = results.data;
            if (rows.length < 1) return;
            const header = rows[0]; 
            let dateCols = [];
            for (let j = 1; j < header.length; j++) {
                const colName = header[j]?.trim();
                if (colName && !colName.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: colName });
                    dates[colName] = { Sala: [], Bar: [] };
                }
            }
            for (let i = 1; i < rows.length; i++) {
                let nameInSched = rows[i][0]?.toString().toLowerCase().trim();
                if (!nameInSched || nameInSched === "name") continue;
                const info = staffMap[nameInSched] || { alias: nameInSched.toUpperCase(), area: 'Sala', position: 'STAFF', priority: 99 };
                dateCols.forEach(col => {
                    let shift = rows[i][col.index]?.toString().trim();
                    if (shift && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                        dates[col.label][info.area].push({ ...info, shiftRaw: shift, displayName: info.alias });
                    }
                });
            }
            scheduleData = dates;
            const dateKeys = Object.keys(dates);
            if(dateKeys.length > 0) {
                document.getElementById('dateSelect').innerHTML = dateKeys.map(k => `<option value="${k}">${k}</option>`).join('');
                document.getElementById('manageDateSelect').innerHTML = dateKeys.map(k => `<option value="${k}">${k}</option>`).join('');
            }
            const elapsed = Date.now() - startTime;
            setTimeout(() => icons.forEach(i => i.classList.remove('spinning')), Math.max(0, 600 - elapsed));
        }
    });
}

// --- BRIEFING GENERATION LOGIC ---

function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayData = scheduleData[selectedDate];

    if (!dayData || (dayData.Sala.length === 0 && dayData.Bar.length === 0)) {
        return alert("No staff working on " + selectedDate);
    }

    const parseTime = (t) => {
        const m = t.match(/(\d{1,2})[:h](\d{2})/);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
    };

    // 1. Filter Today's Staff Only
    let todayStaff = [...dayData.Bar, ...dayData.Sala].map(s => {
        const pts = s.shiftRaw.split(/[-–]/);
        return {
            ...s,
            entryMin: parseTime(pts[0] || "09:00"),
            exitMin: parseTime(pts[1] || "17:30"),
            entryLabel: (pts[0] || "09:00").trim().replace('h', ':'),
            exitLabel: (pts[1] || "17:30").trim().replace('h', ':')
        };
    });

    const barStaff = todayStaff.filter(s => s.area === 'Bar').sort((a,b) => a.entryMin - b.entryMin);
    const salaStaff = todayStaff.filter(s => s.area === 'Sala').sort((a,b) => a.entryMin - b.entryMin);
    const exitingBar = [...barStaff].sort((a,b) => a.exitMin - b.exitMin);
    const exitingSala = [...salaStaff].sort((a,b) => a.exitMin - b.exitMin);

    // 2. ASSIGNMENT RULES (No hardcoded names)
    
    // Porta: Manager -> Head Seller -> Earliest Sala Present
    const manager = todayStaff.find(s => s.position === "MANAGER");
    const headSeller = todayStaff.find(s => s.position === "HEAD SELLER");
    const porta = manager || headSeller || salaStaff[0] || todayStaff[0];

    // Sellers Pool Logic
    // RULE: Manager is never assigned seller if other sala staff present
    let sPool = salaStaff.filter(s => s.position !== 'MANAGER');
    
    // RULE: Exclude "Ana" if other staff present (Only hardcoded check for exclusion rule)
    const poolNoAna = sPool.filter(s => s.displayName.toLowerCase() !== 'ana');
    if (poolNoAna.length > 0) sPool = poolNoAna;

    // Emergency Fallback: If pool is empty (e.g. only Manager working), revert to full Sala list
    if (sPool.length === 0) sPool = salaStaff;

    const sA = sPool[0] || { displayName: "---", entryLabel: "09:00" };
    const sB = sPool[1] || sA;
    const sC = sPool[2];

    // Runner Logic: Find staff by position
    const runnerObj = todayStaff.find(s => s.position.includes('RUNNER'));
    const runnerName = runnerObj ? runnerObj.displayName : "Todos";

    // Fecho de Caixa Priority: Head Seller -> Bar Manager -> Manager
    const caixa = headSeller || todayStaff.find(s => s.position === "BAR MANAGER") || manager || exitingBar[exitingBar.length-1];

    // --- TEMPLATE BUILDING ---
    let b = `Bom dia a todos!\n\n`;
    b += `*BRIEFING ${selectedDate.split('/')[0]}/${selectedDate.split('/')[1]}*\n\n`;
    b += `${porta.entryLabel} Porta: ${porta.displayName}\n\n`;

    b += `BAR:\n`;
    b += `${barStaff[0]?.entryLabel || '07:30'} Abertura Sala/Bar: *${barStaff[0]?.displayName || ''}*\n`;
    b += `${barStaff[0]?.entryLabel || '07:30'} Bar A: *${barStaff[0]?.displayName || ''}* Barista – Bebidas\n`;
    b += `${barStaff[1]?.entryLabel || '08:00'} Bar B: *${barStaff[1]?.displayName || ''}* Barista – Cafés / Caixa\n`;
    if(barStaff[2]) b += `${barStaff[2].entryLabel} Bar C: *${barStaff[2].displayName}*\n`;

    b += `\n⸻⸻⸻⸻\n\n`;
    b += `‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n`;
    b += `——————————————\n\n`;

    b += `SELLERS:\n`;
    b += `${sA.entryLabel} Seller A: *${sA.displayName}*\n`;
    b += `${sB.entryLabel} Seller B: *${sB.displayName}*\n`;
    if(sC) b += `${sC.entryLabel} Seller C: *${sC.displayName}*\n`;
    
    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n`;
    b += `——————————————\n`;
    b += `Seller A: Mesas 20-30\n`;
    b += `Seller B ${sC ? '& C' : ''}: Mesas 1-12\n`;
    b += `——————————————\n\n`;

    b += `RUNNERS:\n`;
    b += `${runnerObj ? runnerObj.entryLabel : '09:00'} Runner A e B: ${runnerName}\n`;
    b += `——————————————\n\n`;

    // HACCP Assignments
    const eb1 = exitingBar[0] || barStaff[0], eb2 = exitingBar[1] || eb1, lb = exitingBar[exitingBar.length-1] || eb1;
    const es1 = exitingSala[0] || salaStaff[0], es2 = exitingSala[1] || es1, ls = exitingSala[exitingSala.length-1] || es1;

    b += `HACCP / LIMPEZA BAR:\n`;
    b += `16:00 Preparações Bar: *${eb1?.displayName || ''}*\n`;
    b += `16:00 Reposição Bar: *${eb2?.displayName || ''}*\n`;
    b += `17:30 Fecho Bar: *${lb?.displayName || ''}*\n\n`;

    b += `HACCP / SALA:\n`;
    b += `16:00- Fecho do sala de cima: *${es1?.displayName || ''}*\n`;
    b += `16:00- Limpeza e reposição aparador/ cadeira de bebés: *${es1?.displayName || ''}*\n`;
    b += `16:00- Repor papel (casa de banho): *${es2?.displayName || ''}*\n`;
    b += `17:30- Limpeza casa de banho (clientes e staff): *${eb2?.displayName || ''}*\n`;
    b += `17:30- Limpeza de espelhos e vidros: *${ls?.displayName || ''}*\n`;
    b += `Fecho da sala: *${ls?.displayName || ''}*\n`;
    b += `${exitingBar[exitingBar.length-1]?.exitLabel || '17:30'} Fecho de Caixa: *${caixa.displayName}*`;

    document.getElementById('modalResult').innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px;">${b}</pre>`;
    document.getElementById('modal').style.display = 'flex';
}

// --- UI AND NAVIGATION ---

function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'editStaffPage') renderStaffList();
    if (pageId === 'showStaffPage') showStaffTable();
}

function showStaffTable() {
    const d = document.getElementById('manageDateSelect').value, day = scheduleData[d];
    if(!day) return;
    const all = [...(day.Bar || []), ...(day.Sala || [])].sort((a,b) => a.priority - b.priority);
    document.getElementById('scheduleTableWrapper').innerHTML = `
        <div style="padding:10px; font-size:10px; font-weight:900; display:grid; grid-template-columns:2fr 1fr 1fr;">
            <span>NAME</span><span>AREA</span><span>HOURS</span>
        </div>` + all.map(s => `
        <div class="staff-row">
            <div><strong>${s.displayName}</strong><br><small>${s.position}</small></div>
            <div><span class="area-tag tag-${s.area.toLowerCase()}">${s.area.toUpperCase()}</span></div>
            <div style="font-weight:bold;">${s.shiftRaw}</div>
        </div>`).join('');
}

function renderStaffList() {
    const keys = Object.keys(staffMap).sort((a,b) => staffMap[a].priority - staffMap[b].priority);
    document.getElementById('staffListContainer').innerHTML = keys.map(k => `
        <div class="staff-edit-card" onclick="openStaffForm('${k}')">
            <div><strong>${staffMap[k].alias}</strong><br><small>${staffMap[k].position}</small></div>
            <div>✏️</div>
        </div>`).join('');
}

function copyBriefing() {
    navigator.clipboard.writeText(document.getElementById('modalResult').innerText).then(() => alert("Copied!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
function closeStaffModal() { document.getElementById('staffModal').style.display = 'none'; }

// --- CRUD OPERATIONS ---

function openStaffForm(key = null) {
    if (key) {
        const s = staffMap[key];
        document.getElementById('editOriginalKey').value = key;
        document.getElementById('formFullName').value = key.toUpperCase();
        document.getElementById('formAlias').value = s.alias;
        document.getElementById('formPosition').value = s.position;
        document.getElementById('deleteBtn').style.display = "block";
    } else {
        document.getElementById('editOriginalKey').value = "";
        document.getElementById('formFullName').value = ""; 
        document.getElementById('formAlias').value = "";
        document.getElementById('deleteBtn').style.display = "none";
    }
    document.getElementById('staffModal').style.display = 'flex';
}

async function processCRUD(action) {
    const orig = document.getElementById('editOriginalKey').value;
    const name = document.getElementById('formFullName').value.trim().toLowerCase();
    const alias = document.getElementById('formAlias').value.trim();
    const pos = document.getElementById('formPosition').value;

    if (action === 'save') {
        if (!name || !alias) return alert("Fill Name and Alias");
        if (orig && orig !== name) delete staffMap[orig];
        staffMap[name] = { alias, area: pos.includes("BAR") ? "Bar" : "Sala", position: pos, priority: POSITION_ORDER[pos] || 99 };
    } else {
        delete staffMap[orig];
    }
    
    closeStaffModal(); 
    const list = Object.keys(staffMap).map(k => [k.toUpperCase(), staffMap[k].area, staffMap[k].position, staffMap[k].alias]);
    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "updateStaff", staffList: list }) })
        .then(() => loadData());
}

function confirmSave() { if(confirm("Save?")) processCRUD('save'); }
function confirmDelete() { if(confirm("Delete?")) processCRUD('delete'); }

window.onload = loadData;
