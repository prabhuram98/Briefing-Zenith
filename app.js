const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}, scheduleData = {}, uniquePositions = new Set();
const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "STAFF": 6 };

// --- DATA INITIALIZATION ---
async function loadData() {
    const btn = document.getElementById('refreshBtn');
    if(btn) btn.classList.add('spinning');
    
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        complete: (results) => {
            staffMap = {};
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const key = row[0].toString().toLowerCase().trim();
                staffMap[key] = { 
                    alias: row[3] || row[0], 
                    area: (row[1]||'').toLowerCase().includes('bar') ? 'Bar' : 'Sala', 
                    position: row[2] || "STAFF", 
                    priority: POSITION_ORDER[row[2]] || 99 
                };
                uniquePositions.add(row[2] || "STAFF");
            });
            document.getElementById('formPosition').innerHTML = Array.from(uniquePositions).sort().map(p => `<option value="${p}">${p}</option>`).join('');
            loadSchedule(btn);
        }
    });
}

function loadSchedule(refreshBtn) {
    Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
        download: true,
        complete: (results) => {
            const dates = {}; const rows = results.data;
            if (rows.length < 1) return;
            const header = rows[0]; let dateCols = [];

            for (let j = 1; j < header.length; j++) {
                if (header[j] && !header[j].toLowerCase().includes("total")) {
                    const d = header[j].trim();
                    dateCols.push({ index: j, label: d });
                    dates[d] = { Sala: [], Bar: [] };
                }
            }

            for (let i = 1; i < rows.length; i++) {
                let name = rows[i][0] ? rows[i][0].toString().toLowerCase().trim() : "";
                if (!name || name === "name") continue;
                const info = staffMap[name] || { alias: name.toUpperCase(), area: 'Sala', position: 'EXTERNAL', priority: 100 };

                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].toString().trim() : "";
                    if (shift && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                        dates[col.label][info.area].push({ displayName: info.alias, position: info.position, priority: info.priority, shiftRaw: shift });
                    }
                });
            }
            scheduleData = dates;
            const keys = Object.keys(dates);
            if(keys.length > 0) {
                const opt = keys.map(k => `<option value="${k}">${k}</option>`).join('');
                document.getElementById('dateSelect').innerHTML = opt;
                document.getElementById('manageDateSelect').innerHTML = opt;
            }
            if(refreshBtn) refreshBtn.classList.remove('spinning');
        }
    });
}

// --- BRIEFING LOGIC (RESTORED) ---
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if (!day) return alert("Select a date.");

    const parseM = (t) => {
        const m = t.match(/(\d{1,2})[:h](\d{2})/);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
    };

    const process = (arr) => arr.map(s => {
        const pts = s.shiftRaw.split(/[-–]/);
        const inTime = pts[0] ? pts[0].replace('h', ':') : "09:00";
        const outTime = pts[1] ? pts[1].replace('h', ':') : "17:30";
        return { ...s, in: inTime, out: outTime, inM: parseM(inTime), outM: parseM(outTime) };
    }).sort((a, b) => a.inM - b.inM);

    const barPool = process(day.Bar);
    const salaPool = process(day.Sala);

    // Dynamic Variables
    const porta = salaPool[0] || { displayName: "N/A", in: "--:--" };
    const barA = barPool[0] || { displayName: "N/A", in: "--:--" };
    const barB = barPool[1] || barA;

    // Exit sorting for HACCP
    const bExit = [...barPool].sort((a, b) => a.outM - b.outM);
    const sExit = [...salaPool].sort((a, b) => a.outM - b.outM);

    const eb1 = bExit[0] || barA;
    const lb = bExit[bExit.length - 1] || barA;
    const es1 = sExit[0] || porta;
    const es2 = sExit[1] || es1;
    const ls = sExit[sExit.length - 1] || porta;

    let b = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
    b += `${porta.in} Porta: ${porta.displayName}\n\n`;
    b += `BAR:\n${barA.in} Abertura Sala/Bar: *${barA.displayName}*\n${barA.in} Bar A: *${barA.displayName}* Barista – Bebidas\n${barB.in} Bar B: *${barB.displayName}* Barista – Cafés / Caixa\n\n`;
    b += `⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\nSELLERS:\n`;

    if (salaPool[1]) b += `${salaPool[1].in} Seller A: *${salaPool[1].displayName}*\n`;
    if (salaPool[2]) b += `${salaPool[2].in} Seller B: *${salaPool[2].displayName}*\n`;
    if (salaPool[3]) b += `${salaPool[3].in} Seller C: *${salaPool[3].displayName}*\n`;

    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\nSeller A: Mesas 20-30\nSeller B ${salaPool.length > 3 ? '& C' : ''}: Mesas 1-12\n——————————————\n\n`;
    b += `HACCP / LIMPEZA BAR:\n${eb1.out} Preparações Bar: *${eb1.displayName}*\n${lb.out} Fecho Bar: *${lb.displayName}*\n\n`;
    b += `HACCP / SALA:\n${es1.out} Fecho do sala de cima: *${es1.displayName}*\n${es1.out} Limpeza e reposição aparador: *${es1.displayName}*\n${es2.out} Repor papel (WC): *${es2.displayName}*\n${ls.out} Fecho Sala: *${ls.displayName}*`;

    document.getElementById('modalResult').innerHTML = `
        <div style="text-align:left;">
            <pre id="copyArea" style="background:#f9f5f0; padding:15px; border-radius:10px; white-space:pre-wrap; font-size:13px; color:#3e2723; border:1px solid #d1bba7;">${b}</pre>
        </div>
    `;
    document.getElementById('modal').style.display = 'flex';
}

function copyBriefing() {
    const text = document.getElementById('copyArea').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('#modal .btn-primary');
        btn.innerText = "COPIED!";
        setTimeout(() => btn.innerText = "Copy", 2000);
    });
}

// --- UI NAVIGATION ---
function openPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'editStaffPage') renderStaffList();
    if (id === 'showStaffPage') showStaffTable();
}

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date];
    if(!day) return;
    const present = [...day.Bar, ...day.Sala].sort((a,b) => a.priority - b.priority);
    document.getElementById('scheduleTableWrapper').innerHTML = present.map(s => `
        <div class="staff-row">
            <div><b>${s.displayName}</b><br><small style="color:#a1887f">${s.position}</small></div>
            <div style="font-weight:bold;">${s.shiftRaw}</div>
        </div>`).join('');
}

function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    const sorted = Object.keys(staffMap).sort((a,b) => staffMap[a].priority - staffMap[b].priority);
    container.innerHTML = sorted.map(k => `<div class="staff-edit-card" onclick="openStaffForm('${k}')"><b>${staffMap[k].alias}</b> ✏️</div>`).join('');
}

function openStaffForm(k = null) {
    if (k) {
        document.getElementById('modalTitle').innerText = "Edit Staff";
        document.getElementById('editOriginalKey').value = k;
        document.getElementById('formFullName').value = k.toUpperCase();
        document.getElementById('formAlias').value = staffMap[k].alias;
        document.getElementById('formPosition').value = staffMap[k].position;
        document.getElementById('deleteBtn').style.display = "block";
    } else {
        document.getElementById('modalTitle').innerText = "New Staff";
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
        if (!name || !alias) return alert("All fields required.");
        if (orig && orig !== name) delete staffMap[orig];
        staffMap[name] = { alias, area: pos.includes("BAR") ? "Bar" : "Sala", position: pos, priority: POSITION_ORDER[pos] || 99 };
    } else { 
        delete staffMap[orig]; 
    }
    
    closeStaffModal();
    const list = Object.keys(staffMap).map(k => [k.toUpperCase(), staffMap[k].area, staffMap[k].position, staffMap[k].alias]);
    
    // Sync to Spreadsheet
    fetch(SCRIPT_URL, { 
        method: 'POST', 
        mode: 'no-cors', 
        body: JSON.stringify({ action: "updateStaff", staffList: list }) 
    }).then(() => { 
        alert("Synced with Sheet"); 
        loadData(); 
    });
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
function closeStaffModal() { document.getElementById('staffModal').style.display = 'none'; }
function confirmSave() { if(confirm("Save changes?")) processCRUD('save'); }
function confirmDelete() { if(confirm("Delete this staff member?")) processCRUD('delete'); }

window.onload = loadData;
