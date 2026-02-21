const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {};
let scheduleData = {};

// --- SILENT BACKGROUND SYNC ---
function openPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    // Silent fetch whenever a user navigates
    loadData().then(() => {
        if (id === 'editStaffPage') renderStaffList();
        if (id === 'showStaffPage') showStaffTable();
    });
}

async function loadData() {
    return new Promise((resolve) => {
        Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
            download: true,
            complete: (results) => {
                staffMap = {};
                results.data.forEach((row, i) => {
                    if (i === 0 || !row[0]) return;
                    const name = row[0].toLowerCase().trim();
                    staffMap[name] = { 
                        alias: row[3] || row[0], 
                        area: row[1] || 'Sala', 
                        position: row[2] || 'Staff' 
                    };
                });
                
                Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
                    download: true,
                    complete: (sResults) => {
                        processSchedule(sResults.data);
                        resolve();
                    }
                });
            }
        });
    });
}

function processSchedule(rows) {
    const dates = {}; const header = rows[0];
    let dateCols = [];
    for (let j = 1; j < header.length; j++) {
        if (header[j] && !header[j].toLowerCase().includes("total")) {
            const d = header[j].trim();
            dateCols.push({ index: j, label: d });
            dates[d] = [];
        }
    }
    for (let i = 1; i < rows.length; i++) {
        let name = rows[i][0]?.toString().toLowerCase().trim();
        if (!name || !staffMap[name]) continue;
        dateCols.forEach(col => {
            let shift = rows[i][col.index]?.toString().trim();
            if (shift && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                dates[col.label].push({ ...staffMap[name], shiftRaw: shift });
            }
        });
    }
    scheduleData = dates;
    updateDropdowns();
}

function updateDropdowns() {
    const keys = Object.keys(scheduleData);
    if(keys.length > 0) {
        const opt = keys.map(k => `<option value="${k}">${k}</option>`).join('');
        const d1 = document.getElementById('dateSelect');
        const d2 = document.getElementById('manageDateSelect');
        if(d1) d1.innerHTML = opt;
        if(d2) d2.innerHTML = opt;
    }
}

// Minimal Briefing Placeholder
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    alert("Displaying staff for: " + date);
}

// ... (Directory rendering and CRUD logic remains standard) ...

window.onload = loadData;
setInterval(loadData, 300000); // 5-minute background refresh
