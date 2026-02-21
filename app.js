/** Zenith Manager v1.8 - app.js **/

const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

window.scheduleData = {};
let staffMap = {};

function openPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    
    if (id === 'editStaffPage') renderStaffList();
}

async function loadData() {
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        complete: (results) => {
            staffMap = {};
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const name = row[0].toLowerCase().trim();
                staffMap[name] = { alias: row[3] || row[0], area: row[1] || 'Sala', position: row[2] || 'Staff' };
            });
            
            Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
                download: true,
                complete: (sResults) => processSchedule(sResults.data)
            });
        }
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
    window.scheduleData = dates;
    updateDropdowns();
}

function updateDropdowns() {
    const keys = Object.keys(window.scheduleData);
    const options = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    if(document.getElementById('dateSelect')) document.getElementById('dateSelect').innerHTML = options;
    if(document.getElementById('manageDateSelect')) document.getElementById('manageDateSelect').innerHTML = options;
}

function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    if (!container) return;
    container.innerHTML = Object.keys(staffMap).map(key => {
        const s = staffMap[key];
        return `<div class="staff-card"><div><strong>${s.alias}</strong><br><small>${s.area} | ${s.position}</small></div></div>`;
    }).join('');
}

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = window.scheduleData[date] || [];
    const container = document.getElementById('scheduleTableWrapper');
    container.innerHTML = day.length ? `<table><thead><tr><th>Alias</th><th>Shift</th></tr></thead><tbody>${day.map(s => `<tr><td>${s.alias}</td><td>${s.shiftRaw}</td></tr>`).join('')}</tbody></table>` : "No staff found.";
}

window.onload = loadData;
