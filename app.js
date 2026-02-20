const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxTXbTbHrr8p3Cc87CIYx6B0wEQdybQoOeWKcna6ED63jr9BBXolLuHLyn_vvv1SVj7fw/exec'; 

let staffMap = {}; 
let scheduleData = {}; 
let rawRows = [];      

const POSITION_ORDER = {
    "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "STAFF": 6
};

// --- DATA LOADING ---
async function loadData() {
    const timestamp = new Date().getTime();
    Papa.parse(`${STAFF_URL}&t=${timestamp}`, {
        download: true,
        complete: (results) => {
            staffMap = {};
            for (let i = 1; i < results.data.length; i++) {
                let row = results.data[i];
                if (row[0] && row[0].trim() !== "") {
                    const nameKey = row[0].trim().toLowerCase();
                    const pos = row[2] ? row[2].trim().toUpperCase() : "STAFF";
                    staffMap[nameKey] = {
                        alias: row[3] ? row[3].trim() : row[0].trim(),
                        area: (row[1] && row[1].toLowerCase().includes('bar')) ? 'Bar' : 'Sala',
                        position: pos,
                        priority: POSITION_ORDER[pos] || 99
                    };
                }
            }
            loadSchedule();
        }
    });
}

function loadSchedule() {
    Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
        download: true,
        complete: (results) => {
            rawRows = results.data;
            const dates = {};
            const headerRow = rawRows[0];
            let dateCols = [];
            for (let j = 1; j < headerRow.length; j++) {
                let label = headerRow[j]?.trim();
                if (label && !label.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: label });
                    dates[label] = { Sala: [], Bar: [] };
                }
            }
            for (let i = 1; i < rawRows.length; i++) {
                let name = rawRows[i][0]?.trim();
                if (!name || name.toLowerCase() === "name") continue;
                const info = staffMap[name.toLowerCase()] || { alias: name, area: 'Sala', position: 'STAFF', priority: 99 };
                dateCols.forEach(col => {
                    let shift = rawRows[i][col.index]?.trim();
                    if (/\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                        let parts = shift.split(/[- ]+/);
                        dates[col.label][info.area].push({
                            displayName: info.alias, position: info.position, priority: info.priority,
                            time: parts[0]?.replace('.', ':') || "--:--",
                            endTime: parts[1]?.replace('.', ':') || "--:--", task: ""
                        });
                    }
                });
            }
            scheduleData = dates;
            const options = Object.keys(dates).map(k => `<option value="${k}">${k}</option>`).join('');
            document.getElementById('dateSelect').innerHTML = options;
            document.getElementById('manageDateSelect').innerHTML = options;
        }
    });
}

// --- NAVIGATION ---
function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if(pageId === 'editStaffPage') renderStaffList();
    if(pageId === 'showStaffPage') showStaffTable();
}

// --- CRUD: MANAGE STAFF ---
function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    container.innerHTML = "";
    Object.keys(staffMap).sort((a,b) => staffMap[a].priority - staffMap[b].priority).forEach(key => {
        const s = staffMap[key];
        const div = document.createElement('div');
        div.className = 'staff-edit-card';
        div.innerHTML = `<div><strong>${s.alias}</strong><br><small>${s.position}</small></div>
                         <div><button onclick="editStaff('${key}')">✏️</button>
                         <button onclick="deleteStaff('${key}')">🗑️</button></div>`;
        container.appendChild(div);
    });
}

async function saveToSheet() {
    const list = Object.keys(staffMap).map(key => [key.toUpperCase(), staffMap[key].area, staffMap[key].position, staffMap[key].alias]);
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: "updateStaff", staffList: list })
    }).then(() => alert("Saved Permanently to Google Sheets!"));
}

function deleteStaff(key) {
    if(confirm(`Delete ${staffMap[key].alias}?`)) { delete staffMap[key]; renderStaffList(); }
}

function editStaff(key) {
    const s = staffMap[key];
    const newAlias = prompt("Alias:", s.alias);
    const newPos = prompt("Position (MANAGER, BAR STAFF, etc):", s.position).toUpperCase();
    if(newAlias) {
        staffMap[key].alias = newAlias;
        staffMap[key].position = newPos;
        staffMap[key].area = newPos.includes("BAR") ? "Bar" : "Sala";
        staffMap[key].priority = POSITION_ORDER[newPos] || 99;
        renderStaffList();
    }
}

// --- SHOW STAFF (GROUPED & SORTED) ---
function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const colIdx = rawRows[0].findIndex(c => c?.trim() === date);
    let present = [];
    for (let i = 1; i < rawRows.length; i++) {
        let name = rawRows[i][0]?.trim();
        let shift = rawRows[i][colIdx]?.trim();
        if (name && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
            const info = staffMap[name.toLowerCase()] || { alias: name, area: 'Sala', position: 'STAFF', priority: 99 };
            present.push({ alias: info.alias, shift, area: info.area, position: info.position, priority: info.priority });
        }
    }
    present.sort((a, b) => a.priority - b.priority);
    let html = `<div class="staff-grid-header"><span>NAME</span><span>AREA</span><span>HOURS</span></div>`;
    present.forEach(s => {
        html += `<div class="staff-row">
            <div>${s.alias}<br><small style="color:#ce8d5a">${s.position}</small></div>
            <div><span class="area-tag tag-${s.area.toLowerCase()}">${s.area.toUpperCase()}</span></div>
            <div>${s.shift}</div></div>`;
    });
    document.getElementById('scheduleTableWrapper').innerHTML = html;
}

window.onload = loadData;
