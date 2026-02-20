const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}, scheduleData = {}, uniquePositions = new Set();
const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "STAFF": 6 };

async function loadData() {
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
            const posDropdown = document.getElementById('formPosition');
            if(posDropdown) posDropdown.innerHTML = Array.from(uniquePositions).sort().map(p => `<option value="${p}">${p}</option>`).join('');
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
                if (!name || name === "name") continue;
                const info = staffMap[name] || { alias: name.toUpperCase(), area: 'Sala', position: 'EXTERNAL', priority: 100 };

                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].toString().trim() : "";
                    if (shift && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                        dates[col.label].push({ alias: info.alias, position: info.position, priority: info.priority, shiftRaw: shift });
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
        }
    });
}

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
    const present = [...day].sort((a,b) => a.priority - b.priority);
    document.getElementById('scheduleTableWrapper').innerHTML = present.map(s => `
        <div class="staff-row">
            <div><b>${s.alias}</b><br><small style="color:#a1887f">${s.position}</small></div>
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

function closeModal() { document.getElementById('modal').style.display = 'none'; }
function closeStaffModal() { document.getElementById('staffModal').style.display = 'none'; }

function generateBriefing() {
    alert("System ready. How would you like to structure the briefing message?");
}

window.onload = loadData;
