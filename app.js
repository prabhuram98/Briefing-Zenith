const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {};
let scheduleData = {};

function openPage(id) {
    document.querySelectorAll('.page').forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });

    const target = document.getElementById(id);
    if (target) {
        target.style.display = 'flex';
        target.classList.add('active');
    }

    // Refresh views based on loaded data
    if (id === 'editStaffPage') renderStaffList();
    if (id === 'showStaffPage') showStaffTable();
}

async function loadData() {
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        complete: (results) => {
            staffMap = {};
            let posSet = new Set();
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const name = row[0].toLowerCase().trim();
                staffMap[name] = { alias: row[3] || row[0], area: row[1] || 'Sala', position: row[2] || 'Staff' };
                posSet.add(row[2] || 'Staff');
            });
            const posDropdown = document.getElementById('formPosition');
            if(posDropdown) {
                posDropdown.innerHTML = Array.from(posSet).sort().map(p => `<option value="${p}">${p}</option>`).join('');
            }
            loadSchedule();
        }
    });
}

function loadSchedule() {
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
                    dates[d] = [];
                }
            }

            for (let i = 1; i < rows.length; i++) {
                let name = rows[i][0] ? rows[i][0].toString().toLowerCase().trim() : "";
                if (!name || !staffMap[name]) continue;
                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].toString().trim() : "";
                    if (shift && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                        dates[col.label].push({ alias: staffMap[name].alias, position: staffMap[name].position, area: staffMap[name].area, shiftRaw: shift });
                    }
                });
            }
            scheduleData = dates;
            updateDropdowns();
        }
    });
}

function updateDropdowns() {
    const keys = Object.keys(scheduleData);
    if(keys.length > 0) {
        const opt = keys.map(k => `<option value="${k}">${k}</option>`).join('');
        document.getElementById('dateSelect').innerHTML = opt;
        document.getElementById('manageDateSelect').innerHTML = opt;
    }
}

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date] || [];
    const activeAreas = [...new Set(day.map(s => s.area))].sort();
    
    document.getElementById('scheduleTableWrapper').innerHTML = activeAreas.map(area => `
        <div class="area-divider">${area}</div>
        ${day.filter(s => s.area === area).map(s => `
            <div class="staff-row">
                <div>
                    <div style="font-weight:800;">${s.alias}</div>
                    <div style="font-size:12px; color:#8e8e93;">${s.position}</div>
                </div>
                <div class="staff-time">${s.shiftRaw}</div>
            </div>`).join('')}
    `).join('');
}

function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    const sorted = Object.keys(staffMap).sort();
    container.innerHTML = sorted.map(k => `
        <div class="staff-edit-card" onclick="openStaffForm('${k}')">
            <div>
                <div style="font-weight:800;">${staffMap[k].alias}</div>
                <div style="font-size:12px; color:#8e8e93;">${staffMap[k].area} • ${staffMap[k].position}</div>
            </div>
            <div style="color:#dbc9b7; font-weight:bold;">EDIT</div>
        </div>`).join('');
}

// CRUD Logic (Reverted to stable version)
async function confirmSave() {
    const fullName = document.getElementById('formFullName').value.trim().toUpperCase();
    const alias = document.getElementById('formAlias').value.trim();
    const position = document.getElementById('formPosition').value;
    const originalKey = document.getElementById('editOriginalKey').value;

    if (!fullName || !alias) return alert("Fill all fields");

    const payload = { 
        action: originalKey ? 'update' : 'add', 
        originalKey, fullName, alias, position, 
        area: staffMap[originalKey?.toLowerCase()]?.area || 'Sala' 
    };

    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        alert("Success!"); closeStaffModal(); loadData();
    } catch (e) { alert("Error connecting"); }
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

function closeStaffModal() { document.getElementById('staffModal').style.display = 'none'; }
function closeModal() { document.getElementById('modal').style.display = 'none'; }

window.onload = loadData;
