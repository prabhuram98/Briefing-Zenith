// app.js - Robust Sequential Loading
window.staffMap = {}; 
window.scheduleData = {}; 

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "RUNNER": 6, "STAFF": 7 };

// --- INITIALIZATION ---
window.onload = function() {
    console.log("App started. Initializing load...");
    if (typeof Papa === 'undefined') {
        alert("External library (PapaParse) failed to load. Please check your internet connection.");
    } else {
        loadData();
    }
};

async function loadData() {
    const syncIcons = document.querySelectorAll('.sync-small');
    syncIcons.forEach(i => i.classList.add('spinning'));
    
    // Step 1: Load Staff Database
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            console.log("Staff Data Received:", results.data.length, "rows");
            window.staffMap = {}; 
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const rawName = row[0].toString().toLowerCase().trim();
                const area = row[1] ? row[1].toString().trim() : "Sala";
                const pos = row[2] ? row[2].toString().trim().toUpperCase() : "STAFF";
                const alias = row[3] ? row[3].toString().trim() : row[0].trim();
                window.staffMap[rawName] = { 
                    alias: alias, 
                    area: area.toLowerCase().includes('bar') ? 'Bar' : 'Sala', 
                    position: pos, 
                    priority: POSITION_ORDER[pos] || 99 
                };
            });
            // Step 2: Load Schedule (Only after staff is mapped)
            loadSchedule(syncIcons);
        },
        error: function(err) {
            console.error("Staff Parse Error:", err);
            alert("Failed to load Staff Database.");
        }
    });
}

function loadSchedule(icons) {
    Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            console.log("Schedule Data Received:", results.data.length, "rows");
            const dates = {}; 
            const rows = results.data;
            if (rows.length < 1) return;
            const header = rows[0]; 
            let dateCols = [];

            // Detect date columns
            for (let j = 1; j < header.length; j++) {
                const colName = header[j]?.trim();
                if (colName && !colName.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: colName });
                    dates[colName] = { Sala: [], Bar: [] };
                }
            }

            // Map shifts to staff
            for (let i = 1; i < rows.length; i++) {
                let nameInSched = rows[i][0]?.toString().toLowerCase().trim();
                const info = window.staffMap[nameInSched];
                if (!info) continue;

                dateCols.forEach(col => {
                    let shift = rows[i][col.index]?.toString().trim() || "";
                    if (/^\d/.test(shift)) {
                        dates[col.label][info.area].push({ ...info, shiftRaw: shift });
                    }
                });
            }
            window.scheduleData = dates;
            
            // Step 3: Populate UI
            updateUI(icons);
        },
        error: function(err) {
            console.error("Schedule Parse Error:", err);
            alert("Failed to load Schedule.");
        }
    });
}

function updateUI(icons) {
    const select = document.getElementById('dateSelect');
    if (select) {
        const dateKeys = Object.keys(window.scheduleData);
        if (dateKeys.length > 0) {
            select.innerHTML = dateKeys.map(k => `<option value="${k}">${k}</option>`).join('');
            console.log("Dropdown updated with", dateKeys.length, "dates.");
        } else {
            select.innerHTML = '<option>No Dates Found</option>';
        }
    }
    icons.forEach(i => i.classList.remove('spinning'));
}

// --- NAVIGATION & VIEWS ---
function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
        if (pageId === 'manageStaffPage') renderStaffList();
        if (pageId === 'dailyViewPage') renderDailyView();
    }
}

function renderDailyView() {
    const container = document.getElementById('dailyViewContainer');
    const selectedDate = document.getElementById('dateSelect').value;
    const dayData = window.scheduleData ? window.scheduleData[selectedDate] : null;

    if (!container) return;
    if (!dayData) {
        container.innerHTML = "<p>Please select a valid date.</p>";
        return;
    }

    const allStaff = [...dayData.Bar, ...dayData.Sala];
    let html = `<h3>Schedule for ${selectedDate}</h3><table style="width:100%; border-collapse: collapse;">`;
    html += '<tr style="background:#eee; text-align:left;"><th>Name</th><th>Dept</th><th>Shift</th></tr>';
    allStaff.forEach(s => {
        html += `<tr style="border-bottom:1px solid #ddd;"><td>${s.alias}</td><td>${s.area}</td><td>${s.shiftRaw}</td></tr>`;
    });
    html += '</table>';
    container.innerHTML = html;
}

function renderStaffList() {
    const listDiv = document.getElementById('staffListContainer');
    if (!listDiv) return;
    let html = '<h3>Staff Directory</h3><table style="width:100%; border-collapse: collapse;">';
    html += '<tr style="background:#eee; text-align:left;"><th>Alias</th><th>Dept</th><th>Role</th></tr>';
    Object.values(window.staffMap).forEach(s => {
        html += `<tr style="border-bottom:1px solid #ddd;"><td>${s.alias}</td><td>${s.area}</td><td>${s.position}</td></tr>`;
    });
    html += '</table>';
    listDiv.innerHTML = html;
}

// --- BRIEFING LOGIC (Same as before) ---
function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayData = window.scheduleData[selectedDate];
    if (!dayData) return alert("Select a date!");

    const parseTime = (t) => {
        const m = t.match(/(\d{1,2})[:h](\d{2})/);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
    };

    const processShift = (s) => {
        const pts = s.shiftRaw.split(/[-–]/);
        return {
            ...s,
            entryLabel: (pts[0] || "09:00").trim().replace('h', ':'),
            exitLabel: (pts[1] || "17:30").trim().replace('h', ':'),
            entryMin: parseTime(pts[0] || "09:00"),
            exitMin: parseTime(pts[1] || "17:30")
        };
    };

    const barPool = dayData.Bar.map(processShift).sort((a,b) => a.entryMin - b.entryMin);
    const salaPool = dayData.Sala.map(processShift).sort((a,b) => a.entryMin - b.entryMin);
    const allActive = [...barPool, ...salaPool];

    // Assignment Logic
    const runners = allActive.filter(s => s.position === 'RUNNER');
    const headSellers = salaPool.filter(s => s.position === 'HEAD SELLER');
    const regularSellers = salaPool.filter(s => (s.position.includes('STAFF') || s.position.includes('SELLER')) && s.position !== 'MANAGER' && s.alias.toLowerCase() !== 'ana' && s.position !== 'RUNNER');
    
    let finalSellers = [...headSellers, ...regularSellers];
    let runnerDisplay = runners.length > 0 ? runners[0].alias : "Todos";

    if (finalSellers.length < 2 && runners.length > 0) {
        finalSellers.push(runners[0]);
        runnerDisplay = "Todos";
    }

    const sA = finalSellers[0] || { alias: "N/A", entryLabel: "--:--" };
    const sB = finalSellers[1] || { alias: "N/A", entryLabel: "--:--" };
    const sC = finalSellers[2];

    const manager = allActive.find(s => s.position === "MANAGER");
    const porta = manager || headSellers[0] || (salaPool.length > 0 ? salaPool[0] : allActive[0]);
    const barA = barPool[0] || { alias: "N/A", entryLabel: "--:--", exitLabel: "--:--" };
    const barB = barPool[1] || barA;

    const bHPool = barPool.filter(s => s.position !== 'MANAGER');
    const bExit = (bHPool.length > 0 ? bHPool : barPool).sort((a,b) => a.exitMin - b.exitMin);
    const eb1 = bExit[0] || barA;
    const eb2 = bExit[1] || eb1;
    const lb = bExit[bExit.length-1] || eb1;

    const sHPool = salaPool.filter(s => s.position !== 'MANAGER');
    const sExit = (sHPool.length > 0 ? sHPool : salaPool).sort((a,b) => a.exitMin - b.exitMin);
    const es1 = sExit[0] || sA;
    const es2 = sExit[1] || es1;
    const ls = sExit[sExit.length-1] || es1;

    const caixa = headSellers[0] || allActive.find(s => s.position === "BAR MANAGER") || manager || lb || ls;

    let b = `Bom dia a todos!\n\n*BRIEFING ${selectedDate}*\n\n`;
    b += `${porta.entryLabel} Porta: ${porta.alias}\n\n`;
    b += `BAR:\n${barA.entryLabel} Abertura Sala/Bar: *${barA.alias}*\n${barA.entryLabel} Bar A: *${barA.alias}* Barista – Bebidas\n${barB.entryLabel} Bar B: *${barB.alias}* Barista – Cafés / Caixa\n`;
    b += `\n⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\nSELLERS:\n`;
    b += `${sA.entryLabel} Seller A: *${sA.alias}*\n${sB.entryLabel} Seller B: *${sB.alias}*\n`;
    if(sC) b += `${sC.entryLabel} Seller C: *${sC.alias}*\n`;
    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\nSeller A: Mesas 20-30\nSeller B ${sC ? '& C' : ''}: Mesas 1-12\n——————————————\n\n`;
    b += `RUNNERS:\n${runners[0] ? runners[0].entryLabel : '09:00'} Runner A e B: ${runnerDisplay}\n——————————————\n\n`;
    b += `HACCP / LIMPEZA BAR:\n${eb1.exitLabel} Preparações Bar: *${eb1.alias}*\n${eb2.exitLabel} Reposição Bar: *${eb2.alias}*\n${lb.exitLabel} Fecho Bar: *${lb.alias}*\n\n`;
    b += `HACCP / SALA:\n${es1.exitLabel} Fecho do sala de cima: *${es1.alias}*\n${es1.exitLabel} Limpeza e reposição aparador: *${es1.alias}*\n${es2.exitLabel} Repor papel (WC): *${es2.alias}*\n${eb2.exitLabel} Limpeza WC (clientes/staff): *${eb2.alias}*\n${ls.exitLabel} Limpeza de vidros: *${ls.alias}*\n${ls.exitLabel} Fecho Sala: *${ls.alias}*\n`;
    b += `${caixa.exitLabel} Fecho de Caixa: *${caixa.alias}*`;

    document.getElementById('modalResult').innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${b}</pre>`;
    document.getElementById('modal').style.display = 'flex';
}

function copyBriefing() {
    navigator.clipboard.writeText(document.getElementById('modalResult').innerText).then(() => alert("Copied!"));
}
