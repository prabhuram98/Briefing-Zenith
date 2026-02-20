const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}, scheduleData = {}, rawRows = [];

const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "STAFF": 6 };

// --- DATA INITIALIZATION ---
async function loadData() {
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        complete: (results) => {
            staffMap = {};
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const key = row[0].trim().toLowerCase();
                const pos = row[2] ? row[2].trim().toUpperCase() : "STAFF";
                staffMap[key] = { alias: row[3] || row[0], area: (row[1] || '').toLowerCase().includes('bar') ? 'Bar' : 'Sala', position: pos, priority: POSITION_ORDER[pos] || 99 };
            });
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
            const header = rawRows[0];
            let dateCols = [];
            for (let j = 1; j < header.length; j++) {
                if (header[j] && !header[j].toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: header[j].trim() });
                    dates[header[j].trim()] = { Sala: [], Bar: [] };
                }
            }
            for (let i = 1; i < rawRows.length; i++) {
                let name = rawRows[i][0]?.trim();
                if (!name || name.toLowerCase() === "name") continue;
                const info = staffMap[name.toLowerCase()] || { alias: name, area: 'Sala', position: 'STAFF', priority: 99 };
                dateCols.forEach(col => {
                    let shift = rawRows[i][col.index]?.trim();
                    if (/\d/.test(shift) && !["OFF", "FOLGA", "FÉRIAS"].includes(shift.toUpperCase())) {
                        dates[col.label][info.area].push({ displayName: info.alias, position: info.position, priority: info.priority, shiftRaw: shift });
                    }
                });
            }
            scheduleData = dates;
            const opt = Object.keys(dates).map(k => `<option value="${k}">${k}</option>`).join('');
            document.getElementById('dateSelect').innerHTML = opt;
            document.getElementById('manageDateSelect').innerHTML = opt;
        }
    });
}

// --- NAVIGATION ---
function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'editStaffPage') renderStaffList();
    if (pageId === 'showStaffPage') showStaffTable();
}

// --- UNIFIED CRUD LOGIC ---
function openStaffForm(key = null) {
    const delBtn = document.getElementById('deleteBtn');
    if (key) {
        const s = staffMap[key];
        document.getElementById('modalTitle').innerText = "Edit Staff Member";
        document.getElementById('editOriginalKey').value = key;
        document.getElementById('formFullName').value = key.toUpperCase();
        document.getElementById('formAlias').value = s.alias;
        document.getElementById('formPosition').value = s.position;
        delBtn.style.display = "block";
    } else {
        document.getElementById('modalTitle').innerText = "New Staff Member";
        document.getElementById('editOriginalKey').value = "";
        document.getElementById('formFullName').value = "";
        document.getElementById('formAlias').value = "";
        document.getElementById('formPosition').value = "SALA STAFF";
        delBtn.style.display = "none";
    }
    document.getElementById('staffModal').style.display = 'flex';
}

function confirmSave() { if (confirm("Save changes to spreadsheet?")) processCRUD('save'); }
function confirmDelete() { if (confirm("Permanently delete this staff member?")) processCRUD('delete'); }

async function processCRUD(action) {
    const originalKey = document.getElementById('editOriginalKey').value;
    const fullName = document.getElementById('formFullName').value.trim().toLowerCase();
    const alias = document.getElementById('formAlias').value.trim();
    const pos = document.getElementById('formPosition').value;

    if (action === 'save') {
        if (!fullName || !alias) return alert("Fill all fields");
        if (originalKey && originalKey !== fullName) delete staffMap[originalKey];
        staffMap[fullName] = { alias: alias, area: pos.includes("BAR") ? "Bar" : "Sala", position: pos, priority: POSITION_ORDER[pos] || 99 };
    } else {
        delete staffMap[originalKey];
    }

    closeStaffModal();
    renderStaffList();
    await syncToCloud();
}

async function syncToCloud() {
    const list = Object.keys(staffMap).map(k => [k.toUpperCase(), staffMap[k].area, staffMap[k].position, staffMap[k].alias]);
    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "updateStaff", staffList: list }) })
    .then(() => alert("Cloud Sync Complete"));
}

function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    container.innerHTML = Object.keys(staffMap).sort((a,b) => staffMap[a].priority - staffMap[b].priority).map(k => `
        <div class="staff-edit-card" onclick="openStaffForm('${k}')">
            <div><strong>${staffMap[k].alias}</strong><br><span class="role-subtitle">${staffMap[k].position}</span></div>
            <div>✏️</div>
        </div>`).join('');
}

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date];
    const present = [...(day?.Bar || []), ...(day?.Sala || [])].sort((a,b) => a.priority - b.priority);
    document.getElementById('scheduleTableWrapper').innerHTML = `<div class="staff-grid-header"><span>NAME</span><span>AREA</span><span>HOURS</span></div>` + 
        present.map(s => `<div class="staff-row">
            <div>${s.displayName}<br><span class="role-subtitle">${s.position}</span></div>
            <div><span class="area-tag tag-${s.area.toLowerCase()}">${s.area.toUpperCase()}</span></div>
            <div>${s.shiftRaw}</div></div>`).join('');
}

function closeStaffModal() { document.getElementById('staffModal').style.display = 'none'; }
window.onload = loadData;
