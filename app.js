const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
let uniquePositions = new Set();
const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "RUNNER": 6, "STAFF": 7 };

// --- DATA INITIALIZATION & SYNC ---

async function loadData() {
    const icons = document.querySelectorAll('.sync-small');
    icons.forEach(i => i.classList.add('spinning'));
    const startTime = Date.now();

    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            staffMap = {}; 
            uniquePositions.clear();
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const rawName = row[0].toString().toLowerCase().trim();
                const area = row[1] ? row[1].toString().trim() : "Sala";
                const pos = row[2] ? row[2].toString().trim().toUpperCase() : "STAFF";
                const alias = row[3] ? row[3].toString().trim() : row[0].trim();
                uniquePositions.add(pos);
                staffMap[rawName] = { 
                    alias: alias, 
                    area: area.toLowerCase().includes('bar') ? 'Bar' : 'Sala', 
                    position: pos, 
                    priority: POSITION_ORDER[pos] || 99 
                };
            });
            
            const sortedPos = Array.from(uniquePositions).sort();
            const posSelect = document.getElementById('formPosition');
            if (posSelect) posSelect.innerHTML = sortedPos.map(p => `<option value="${p}">${p}</option>`).join('');
            
            loadSchedule(icons, startTime);
        }
    });
}

function loadSchedule(icons, startTime) {
    Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            const dates = {}; 
            const rows = results.data;
            if (rows.length < 1) return;
            const header = rows[0]; 
            let dateCols = [];

            for (let j = 1; j < header.length; j++) {
                const colName = header[j] ? header[j].trim() : "";
                if (colName && !colName.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: colName });
                    dates[colName] = { Sala: [], Bar: [] };
                }
            }

            for (let i = 1; i < rows.length; i++) {
                let nameInSched = rows[i][0] ? rows[i][0].toString().toLowerCase().trim() : "";
                if (!nameInSched || nameInSched === "name") continue;
                const info = staffMap[nameInSched] || { alias: nameInSched.toUpperCase(), area: 'Sala', position: 'EXTERNAL', priority: 99 };
                
                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].toString().trim() : "";
                    if (shift && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                        dates[col.label][info.area].push({ 
                            displayName: info.alias, 
                            position: info.position, 
                            priority: info.priority, 
                            shiftRaw: shift,
                            area: info.area
                        });
                    }
                });
            }

            scheduleData = dates;
            const dateKeys = Object.keys(dates);
            if(dateKeys.length > 0) {
                const optHtml = dateKeys.map(k => `<option value="${k}">${k}</option>`).join('');
                document.getElementById('dateSelect').innerHTML = optHtml;
                document.getElementById('manageDateSelect').innerHTML = optHtml;
                showStaffTable();
            }

            const elapsed = Date.now() - startTime;
            setTimeout(() => {
                icons.forEach(i => i.classList.remove('spinning'));
            }, Math.max(0, 600 - elapsed));
        }
    });
}

// --- BRIEFING GENERATION LOGIC ---

function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if (!day) return alert("No data for this date");

    const parseTime = (timeStr) => {
        const match = timeStr.match(/(\d{1,2})[:h](\d{2})/);
        return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : 0;
    };

    let allStaff = [...(day.Bar || []), ...(day.Sala || [])].map(s => {
        const times = s.shiftRaw.split(/[-–]/);
        return {
            ...s,
            entryTime: parseTime(times[0]),
            exitTime: parseTime(times[1] || "00:00"),
            timeLabel: (times[0] || "09:00").trim().replace('h', ':'),
            exitLabel: (times[1] || "17:30").trim().replace('h', ':')
        };
    });

    const byEntry = [...allStaff].sort((a, b) => a.entryTime - b.entryTime || a.priority - b.priority);
    const byExit = [...allStaff].sort((a, b) => a.exitTime - b.exitTime || a.priority - b.priority);
    
    const barByEntry = byEntry.filter(s => s.area === 'Bar');
    const barByExit = byExit.filter(s => s.area === 'Bar');
    const salaByEntry = byEntry.filter(s => s.area === 'Sala');
    const salaByExit = byExit.filter(s => s.area === 'Sala');

    // 1. Porta Priority: Manager -> Head Seller -> Earliest Sala
    const manager = allStaff.find(s => s.position.toUpperCase() === "MANAGER");
    const headSeller = allStaff.find(s => s.position.toUpperCase() === "HEAD SELLER");
    const portaStaff = manager || headSeller || salaByEntry[0] || byEntry[0];

    // 2. Sellers Logic: Exclude Ana if others exist
    const sellersPool = salaByEntry.filter(s => s.displayName.toLowerCase() !== 'ana' || salaByEntry.length === 1);
    const sellerA = sellersPool[0] || salaByEntry[0];
    const sellerB = sellersPool[1] || sellerA;
    const sellerC = sellersPool[2];

    // 3. Runner Logic: Dynamic check for RUNNER position
    const runnerStaff = allStaff.find(s => s.position.toUpperCase().includes('RUNNER'));
    const runnerText = runnerStaff ? runnerStaff.displayName : "Todos";

    // 4. Fecho de Caixa: Head Seller -> Bar Manager -> Manager
    const fechoCaixaStaff = 
        allStaff.find(s => s.position.toUpperCase() === "HEAD SELLER") || 
        allStaff.find(s => s.position.toUpperCase() === "BAR MANAGER") || 
        manager || 
        byExit[byExit.length - 1];

    const lastBarExitTime = barByExit.length > 0 ? barByExit[barByExit.length-1].exitLabel : "17:30";

    // --- TEMPLATE BUILDING ---
    let b = `Bom dia a todos!\n\n`;
    b += `*BRIEFING ${date.split('/')[0]}/${date.split('/')[1]}*\n\n`;
    b += `${portaStaff.timeLabel} Porta: ${portaStaff.displayName}\n\n`;

    b += `BAR:\n`;
    b += `${barByEntry[0]?.timeLabel || '07:30'} Abertura Sala/Bar: *${barByEntry[0]?.displayName || ''}*\n`;
    b += `${barByEntry[0]?.timeLabel || '07:30'} Bar A: *${barByEntry[0]?.displayName || ''}* Barista – Bebidas\n`;
    b += `${barByEntry[1]?.timeLabel || '08:00'} Bar B: *${barByEntry[1]?.displayName || ''}* Barista – Cafés / Caixa\n`;
    if(barByEntry[2]) b += `${barByEntry[2].timeLabel} Bar C: *${barByEntry[2].displayName}*\n`;

    b += `\n⸻⸻⸻⸻\n\n`;
    b += `‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n`;
    b += `——————————————\n\n`;

    b += `SELLERS:\n`;
    b += `${sellerA.timeLabel} Seller A: *${sellerA.displayName}*\n`;
    b += `${sellerB.timeLabel} Seller B: *${sellerB.displayName}*\n`;
    if(sellerC) b += `${sellerC.timeLabel} Seller C: *${sellerC.displayName}*\n`;
    
    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n`;
    b += `——————————————\n`;
    b += `Seller A: Mesas 20-30\n`;
    b += `Seller B ${sellerC ? '& C' : ''}: Mesas 1-12\n`;
    b += `——————————————\n\n`;

    b += `RUNNERS:\n`;
    b += `${runnerStaff ? runnerStaff.timeLabel : '09:00'} Runner A e B: ${runnerText}\n`;
    b += `——————————————\n\n`;

    // HACCP Assignments
    const eb1 = barByExit[0] || barByEntry[0];
    const eb2 = barByExit[1] || eb1;
    const lb = barByExit[barByExit.length-1] || eb1;
    const es1 = salaByExit[0] || salaByEntry[0];
    const es2 = salaByExit[1] || es1;
    const ls = salaByExit[salaByExit.length-1] || es1;

    b += `HACCP / LIMPEZA BAR:\n`;
    b += `16:00 Preparações Bar: *${eb1.displayName}*\n`;
    b += `16:00 Reposição Bar: *${eb2.displayName}*\n`;
    b += `17:30 Fecho Bar: *${lb.displayName}*\n\n`;

    b += `HACCP / SALA:\n`;
    b += `16:00- Fecho do sala de cima: *${es1.displayName}*\n`;
    b += `16:00- Limpeza e reposição aparador/ cadeira de bebés: *${es1.displayName}*\n`;
    b += `16:00- Repor papel (casa de banho): *${es2.displayName}*\n`;
    b += `17:30- Limpeza casa de banho (clientes e staff): *${eb2.displayName}*\n`;
    b += `17:30- Limpeza de espelhos e vidros: *${ls.displayName}*\n`;
    b += `Fecho da sala: *${ls.displayName}*\n`;
    b += `${lastBarExitTime} Fecho de Caixa: *${fechoCaixaStaff.displayName}*`;

    document.getElementById('modalResult').innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px;">${b}</pre>`;
    document.getElementById('modal').style.display = 'flex';
}

// --- UI HELPERS & NAVIGATION ---

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date];
    if(!day) return;
    const present = [...(day.Bar || []), ...(day.Sala || [])].sort((a,b) => a.priority - b.priority);
    document.getElementById('scheduleTableWrapper').innerHTML = `
        <div style="padding: 10px 15px; font-size: 10px; font-weight: 900; color: #7a4f2c; display: grid; grid-template-columns: 2fr 1fr 1fr;">
            <span>NAME</span><span>AREA</span><span>HOURS</span>
        </div>
        ` + present.map(s => `
        <div class="staff-row">
            <div><strong>${s.displayName}</strong><br><span class="role-subtitle">${s.position}</span></div>
            <div><span class="area-tag tag-${s.area.toLowerCase()}">${s.area.toUpperCase()}</span></div>
            <div style="font-weight:bold;">${s.shiftRaw}</div>
        </div>`).join('');
}

function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    const sortedKeys = Object.keys(staffMap).sort((a,b) => staffMap[a].priority - staffMap[b].priority);
    container.innerHTML = sortedKeys.map(k => `
        <div class="staff-edit-card" onclick="openStaffForm('${k}')">
            <div><strong>${staffMap[k].alias}</strong><br><span class="role-subtitle">${staffMap[k].position}</span></div>
            <div style="color:#7a4f2c">✏️</div>
        </div>`).join('');
}

function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'editStaffPage') renderStaffList();
    if (pageId === 'showStaffPage') showStaffTable();
}

function copyBriefing() {
    const text = document.getElementById('modalResult').innerText;
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
function closeStaffModal() { document.getElementById('staffModal').style.display = 'none'; }

// --- CRUD OPERATIONS ---

function openStaffForm(key = null) {
    const modal = document.getElementById('staffModal');
    if (key) {
        const s = staffMap[key];
        document.getElementById('modalTitle').innerText = "Edit Staff";
        document.getElementById('editOriginalKey').value = key;
        document.getElementById('formFullName').value = key.toUpperCase();
        document.getElementById('formAlias').value = s.alias;
        document.getElementById('formPosition').value = s.position;
        document.getElementById('deleteBtn').style.display = "block";
    } else {
        document.getElementById('modalTitle').innerText = "New Staff";
        document.getElementById('editOriginalKey').value = "";
        document.getElementById('formFullName').value = ""; 
        document.getElementById('formAlias').value = "";
        document.getElementById('deleteBtn').style.display = "none";
    }
    modal.style.display = 'flex';
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
        .then(() => { loadData(); });
}

function confirmSave() { if(confirm("Save changes?")) processCRUD('save'); }
function confirmDelete() { if(confirm("Permanently delete?")) processCRUD('delete'); }

window.onload = loadData;
