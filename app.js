const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {};
let scheduleData = {};
let dynamicPositions = new Set();

// --- NAVIGATION ---
function openPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    
    if (id === 'editStaffPage') renderStaffList();
    if (id === 'showStaffPage') showStaffTable();
}

// --- DATA SYNC ---
async function loadData() {
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        complete: (results) => {
            staffMap = {};
            dynamicPositions.clear();
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const name = row[0].toLowerCase().trim();
                const area = row[1] || 'General';
                const pos = row[2] || 'Staff';
                const alias = row[3] || row[0];
                
                staffMap[name] = { alias, area, position: pos };
                dynamicPositions.add(pos);
            });
            
            const posDropdown = document.getElementById('formPosition');
            if(posDropdown) {
                posDropdown.innerHTML = Array.from(dynamicPositions).sort().map(p => `<option value="${p}">${p}</option>`).join('');
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
                const info = staffMap[name];

                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].toString().trim() : "";
                    if (shift && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                        dates[col.label].push({ alias: info.alias, position: info.position, area: info.area, shiftRaw: shift });
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
            console.log("Sync successful");
        }
    });
}

// --- STAFF DIRECTORY ---
function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    const sorted = Object.keys(staffMap).sort();
    container.innerHTML = sorted.map(k => `
        <div class="staff-edit-card" onclick="openStaffForm('${k}')">
            <div><b>${staffMap[k].alias}</b><br><small>${staffMap[k].area} | ${staffMap[k].position}</small></div>
            <span>✏️</span>
        </div>`).join('');
}

function openStaffForm(k = null) {
    const modal = document.getElementById('staffModal');
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
    modal.style.display = 'flex';
}

function closeStaffModal() { document.getElementById('staffModal').style.display = 'none'; }

// --- DAILY VIEW ---
function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date];
    if(!day) return;
    
    // Dynamically identify all areas present today
    const activeAreas = [...new Set(day.map(s => s.area))].sort();
    
    document.getElementById('scheduleTableWrapper').innerHTML = activeAreas.map(area => `
        <div style="margin: 15px 0 5px 0; font-weight: 900; border-bottom: 1px solid #3e2723; padding-bottom: 3px;">${area.toUpperCase()}</div>
        ${day.filter(s => s.area === area).map(s => `
            <div class="staff-row">
                <div><b>${s.alias}</b><br><small>${s.position}</small></div>
                <div style="font-weight:bold;">${s.shiftRaw}</div>
            </div>`).join('')}
    `).join('');
}

// --- BRIEFING ---
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    document.getElementById('modalResult').innerHTML = `<h3>Briefing: ${date}</h3><p>Area-based tasks will be computed here.</p>`;
    document.getElementById('modal').style.display = 'flex';
}
function closeModal() { document.getElementById('modal').style.display = 'none'; }

window.onload = loadData;
