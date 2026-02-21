/**
 * Zenith Manager v1.8 - app.js
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

// Global Data Source
window.scheduleData = {}; 
let staffMap = {}; 

function openPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    loadData().then(() => {
        if (id === 'editStaffPage') renderStaffList();
        if (id === 'showStaffPage') showStaffTable();
    });
}

async function loadData() {
    return new Promise((resolve) => {
        // Load Directory
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
                // Load Schedule
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
    const dates = {}; 
    const header = rows[0]; 
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
                dates[col.label].push({ ...staffMap[name], fullName: name, shiftRaw: shift });
            }
        });
    }
    // Shared global state
    window.scheduleData = dates; 
    updateDropdowns();
}

function updateDropdowns() {
    const keys = Object.keys(window.scheduleData);
    if(keys.length > 0) {
        const opt = keys.map(k => `<option value="${k}">${k}</option>`).join('');
        if(document.getElementById('dateSelect')) document.getElementById('dateSelect').innerHTML = opt;
        if(document.getElementById('manageDateSelect')) document.getElementById('manageDateSelect').innerHTML = opt;
    }
}

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = window.scheduleData[date] || [];
    const container = document.getElementById('scheduleTableWrapper');
    if (day.length === 0) { container.innerHTML = "<p>No data.</p>"; return; }
    container.innerHTML = `<div class="table-container"><table><thead><tr><th>Staff</th><th>Area</th><th>Shift</th></tr></thead><tbody>${day.map(s => `<tr><td><b>${s.alias}</b></td><td>${s.area}</td><td>${s.shiftRaw}</td></tr>`).join('')}</tbody></table></div>`;
}

// Initial Load
window.onload = loadData;
