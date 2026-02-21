/** Zenith Manager v1.8 - app.js **/

const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

window.scheduleData = {};
let staffMap = {};

function openPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
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
            if (shift && /\d/.test(shift)) {
                dates[col.label].push({ ...staffMap[name], shiftRaw: shift });
            }
        });
    }
    window.scheduleData = dates;
    updateDropdowns();
}

function updateDropdowns() {
    const keys = Object.keys(window.scheduleData);
    const html = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    document.getElementById('dateSelect').innerHTML = html;
    document.getElementById('manageDateSelect').innerHTML = html;
}

function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    container.innerHTML = Object.keys(staffMap).sort().map(key => {
        const s = staffMap[key];
        return `
            <div class="form-field">
                <div><div class="form-label">Name / Alias</div><div class="form-value">${s.alias}</div></div>
                <div style="text-align:right"><div class="form-label">Role</div><div class="form-value" style="color:#8d6e63">${s.area}</div></div>
            </div>`;
    }).join('');
}

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = window.scheduleData[date] || [];
    document.getElementById('scheduleTableWrapper').innerHTML = day.map(s => `
        <div class="form-field">
            <div><div class="form-label">Staff Member</div><div class="form-value">${s.alias}</div></div>
            <div style="text-align:right"><div class="form-label">Shift Time</div><div class="form-value">${s.shiftRaw}</div></div>
        </div>`).join('');
}

window.onload = loadData;
