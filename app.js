// app.js - MASTER CONTROLLER
window.staffMap = {}; 
window.scheduleData = {}; 

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "RUNNER": 6, "STAFF": 7 };

// --- 1. INITIALIZATION ---
window.onload = function() {
    console.log("Initializing App...");
    loadData();
};

async function loadData() {
    const syncIcons = document.querySelectorAll('.sync-small');
    syncIcons.forEach(i => i.classList.add('spinning'));
    
    // Step 1: Load Staff
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            window.staffMap = {}; 
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const rawName = row[0].toString().toLowerCase().trim();
                const area = row[1] ? row[1].toString().trim() : "Sala";
                const pos = row[2] ? row[2].toString().trim().toUpperCase() : "STAFF";
                const alias = row[3] ? row[3].toString().trim() : row[0].trim();
                window.staffMap[rawName] = { 
                    name: row[0].trim(),
                    alias: alias, 
                    area: area.toLowerCase().includes('bar') ? 'Bar' : 'Sala', 
                    position: pos 
                };
            });
            // Step 2: Load Schedule
            loadSchedule(syncIcons);
        }
    });
}

function loadSchedule(icons) {
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
                const colName = header[j]?.trim();
                if (colName && !colName.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: colName });
                    dates[colName] = { Sala: [], Bar: [] };
                }
            }

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
            updateDateDropdown();
            icons.forEach(i => i.classList.remove('spinning'));
        }
    });
}

function updateDateDropdown() {
    const select = document.getElementById('dateSelect');
    if (select) {
        const dateKeys = Object.keys(window.scheduleData);
        select.innerHTML = dateKeys.length > 0 
            ? dateKeys.map(k => `<option value="${k}">${k}</option>`).join('')
            : '<option>No Dates Available</option>';
    }
}

// --- 2. NAVIGATION & CRUD FUNCTIONS ---
function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
        if (pageId === 'manageStaffPage') renderStaffList();
        if (pageId === 'dailyViewPage') renderDailyView();
    }
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

function openStaffForm(name = '', area = 'Sala', pos = 'STAFF', alias = '') {
    const modal = document.getElementById('modal');
    const resultArea = document.getElementById('modalResult');
    
    resultArea.innerHTML = `
        <div style="padding: 20px; text-align: left;">
            <h3>${name ? 'Edit' : 'Add'} Staff Member</h3>
            <div style="margin-bottom:10px;">
                <label>Full Name (as in Excel):</label><br>
                <input type="text" id="formName" value="${name}" ${name ? 'readonly' : ''} style="width:100%; padding:8px;">
            </div>
            <div style="margin-bottom:10px;">
                <label>Alias (for Briefing):</label><br>
                <input type="text" id="formAlias" value="${alias || name}" style="width:100%; padding:8px;">
            </div>
            <div style="margin-bottom:10px;">
                <label>Area:</label><br>
                <select id="formArea" style="width:100%; padding:8px;">
                    <option value="Sala" ${area==='Sala'?'selected':''}>Sala</option>
                    <option value="Bar" ${area==='Bar'?'selected':''}>Bar</option>
                </select>
            </div>
            <div style="margin-bottom:10px;">
                <label>Position:</label><br>
                <select id="formPos" style="width:100%; padding:8px;">
                    ${Object.keys(POSITION_ORDER).map(p => `<option value="${p}" ${pos===p?'selected':''}>${p}</option>`).join('')}
                </select>
            </div>
            <button onclick="saveStaffEntry()" style="width:100%; padding:10px; background:#28a745; color:white; border:none; cursor:pointer;">SAVE CHANGES</button>
        </div>
    `;
    modal.style.display = 'flex';
}

async function saveStaffEntry() {
    const data = {
        name: document.getElementById('formName').value,
        alias: document.getElementById('formAlias').value,
        area: document.getElementById('formArea').value,
        position: document.getElementById('formPos').value
    };
    
    // Simulate save or connect to your SCRIPT_URL here
    alert("Sending to database: " + data.alias);
    closeModal();
    loadData(); // Reload to see changes
}

// --- 3. RENDERING VIEWS ---
function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    if (!container) return;
    let html = `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <strong>Staff Directory</strong>
        <button onclick="openStaffForm()">+ New Staff</button>
    </div><table style="width:100%; border-collapse:collapse; font-size:13px;">`;
    html += '<tr style="background:#eee;"><th>Alias</th><th>Dept</th><th>Role</th><th></th></tr>';
    Object.values(window.staffMap).forEach(s => {
        html += `<tr style="border-bottom:1px solid #ddd;">
            <td>${s.alias}</td><td>${s.area}</td><td>${s.position}</td>
            <td><button onclick="openStaffForm('${s.name}','${s.area}','${s.position}','${s.alias}')">Edit</button></td>
        </tr>`;
    });
    container.innerHTML = html + '</table>';
}

function renderDailyView() {
    const container = document.getElementById('dailyViewContainer');
    const selectedDate = document.getElementById('dateSelect').value;
    const dayData = window.scheduleData ? window.scheduleData[selectedDate] : null;
    if (!container || !dayData) return;

    const all = [...dayData.Bar, ...dayData.Sala];
    let html = `<strong>Today's Shifts (${selectedDate})</strong><table style="width:100%; border-collapse:collapse; margin-top:10px;">`;
    all.forEach(s => {
        html += `<tr style="border-bottom:1px solid #eee;"><td>${s.alias}</td><td>${s.area}</td><td>${s.shiftRaw}</td></tr>`;
    });
    container.innerHTML = html + '</table>';
}

// --- 4. BRIEFING ENGINE ---
function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayData = window.scheduleData[selectedDate];
    if (!dayData) return alert("Data not ready!");

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
    const porta = manager || headSellers[0] || (salaPool[0]) || allActive[0];
    const barA = barPool[0] || { alias: "N/A", entryLabel: "--:--", exitLabel: "--:--" };
    const barB = barPool[1] || barA;

    // HACCP Assignments (Bar tasks to Bar, Sala tasks to Sala)
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

    let b = `*BRIEFING ${selectedDate}*\n\n`;
    b += `${porta.entryLabel} Porta: ${porta.alias}\n\n`;
    b += `BAR:\n${barA.entryLabel} Abertura: *${barA.alias}*\n${barA.entryLabel} Bar A: *${barA.alias}*\n${barB.entryLabel} Bar B: *${barB.alias}*\n\n`;
    b += `SELLERS:\n${sA.entryLabel} Seller A: *${sA.alias}*\n${sB.entryLabel} Seller B: *${sB.alias}*\n`;
    if(sC) b += `${sC.entryLabel} Seller C: *${sC.alias}*\n`;
    b += `\nRUNNER: ${runnerDisplay}\n\n`;
    b += `HACCP BAR:\n${eb1.exitLabel} Prep: ${eb1.alias}\n${lb.exitLabel} Fecho: ${lb.alias}\n\n`;
    b += `HACCP SALA:\n${es1.exitLabel} Cima: ${es1.alias}\n${ls.exitLabel} Fecho: ${ls.alias}\n\n`;
    b += `${caixa.exitLabel} Caixa: ${caixa.alias}`;

    document.getElementById('modalResult').innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${b}</pre>`;
    document.getElementById('modal').style.display = 'flex';
}

function copyBriefing() {
    navigator.clipboard.writeText(document.getElementById('modalResult').innerText).then(() => alert("Copied!"));
}
