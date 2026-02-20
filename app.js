// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
let uniquePositions = new Set();
const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "STAFF": 6 };

// --- 1. DATA LOADING (The Sequence) ---
async function loadData() {
    const btn = document.getElementById('refreshBtn');
    if(btn) btn.classList.add('spinning');
    
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            staffMap = {}; 
            uniquePositions.clear();
            
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                
                // NORMALIZE: lowercase and trim for matching
                const nameKey = row[0].toString().toLowerCase().trim();
                const area = row[1] ? row[1].toString().trim() : "Sala";
                const pos = row[2] ? row[2].toString().trim().toUpperCase() : "STAFF";
                const alias = row[3] ? row[3].toString().trim() : row[0].trim();
                
                uniquePositions.add(pos);
                staffMap[nameKey] = { 
                    alias: alias, 
                    area: area.toLowerCase().includes('bar') ? 'Bar' : 'Sala', 
                    position: pos, 
                    priority: POSITION_ORDER[pos] || 99 
                };
            });

            // Update Position Dropdown
            const sortedPos = Array.from(uniquePositions).sort();
            const posDropdown = document.getElementById('formPosition');
            if(posDropdown) {
                posDropdown.innerHTML = sortedPos.map(p => `<option value="${p}">${p}</option>`).join('');
            }

            loadSchedule(btn);
        }
    });
}

function loadSchedule(refreshBtn) {
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
                const colName = header[j] ? header[j].trim() : "";
                if (colName && !colName.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: colName });
                    dates[colName] = { Sala: [], Bar: [] };
                }
            }

            for (let i = 1; i < rows.length; i++) {
                let rawName = rows[i][0] ? rows[i][0].toString().toLowerCase().trim() : "";
                if (!rawName || rawName === "name") continue;

                // Match with Dictionary
                const info = staffMap[rawName] || { 
                    alias: rawName.toUpperCase(), 
                    area: 'Sala', 
                    position: 'EXTERNAL', 
                    priority: 99 
                };

                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].toString().trim() : "";
                    if (shift && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                        dates[col.label][info.area].push({ 
                            displayName: info.alias, 
                            position: info.position, 
                            priority: info.priority, 
                            shiftRaw: shift 
                        });
                    }
                });
            }
            
            scheduleData = dates;
            const dateKeys = Object.keys(dates);
            if(dateKeys.length > 0) {
                const optHtml = dateKeys.map(k => `<option value="${k}">${k}</option>`).join('');
                document.getElementById('dateSelect').innerHTML = optHtml;
                document.getElementById('manageDateSelect').innerHTML = optHtml;
                
                // Auto-refresh the views
                if(document.getElementById('showStaffPage').classList.contains('active')) showStaffTable();
                if(document.getElementById('editStaffPage').classList.contains('active')) renderStaffList();
            }

            if(refreshBtn) refreshBtn.classList.remove('spinning');
        }
    });
}

// --- 2. UI NAVIGATION ---
function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'editStaffPage') renderStaffList();
    if (pageId === 'showStaffPage') showStaffTable();
}

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date];
    if(!day) return;
    
    const present = [...(day.Bar || []), ...(day.Sala || [])].sort((a,b) => a.priority - b.priority);
    
    document.getElementById('scheduleTableWrapper').innerHTML = `
        <div class="staff-grid-header"><span>NAME</span><span>AREA</span><span>HOURS</span></div>
        ` + present.map(s => `
        <div class="staff-row">
            <div><strong>${s.displayName}</strong><br><span class="role-subtitle">${s.position}</span></div>
            <div><span class="area-tag tag-${s.area.toLowerCase()}">${s.area.toUpperCase()}</span></div>
            <div>${s.shiftRaw}</div>
        </div>`).join('');
}

// --- 3. STAFF DIRECTORY (CRUD) ---
function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    const sortedKeys = Object.keys(staffMap).sort((a,b) => staffMap[a].priority - staffMap[b].priority);
    container.innerHTML = sortedKeys.map(k => `
        <div class="staff-edit-card" onclick="openStaffForm('${k}')">
            <div><strong>${staffMap[k].alias}</strong><br><span class="role-subtitle">${staffMap[k].position}</span></div>
            <div style="color:#7a4f2c">✏️</div>
        </div>`).join('');
}

function openStaffForm(key = null) {
    const delBtn = document.getElementById('deleteBtn');
    if (key) {
        const s = staffMap[key];
        document.getElementById('modalTitle').innerText = "Edit Staff";
        document.getElementById('editOriginalKey').value = key;
        document.getElementById('formFullName').value = key.toUpperCase();
        document.getElementById('formAlias').value = s.alias;
        document.getElementById('formPosition').value = s.position;
        delBtn.style.display = "block";
    } else {
        document.getElementById('modalTitle').innerText = "New Staff";
        document.getElementById('editOriginalKey').value = "";
        document.getElementById('formFullName').value = ""; 
        document.getElementById('formAlias').value = "";
        delBtn.style.display = "none";
    }
    document.getElementById('staffModal').style.display = 'flex';
}

function closeStaffModal() {
    document.getElementById('staffModal').style.display = 'none';
}

async function processCRUD(action) {
    const orig = document.getElementById('editOriginalKey').value;
    const name = document.getElementById('formFullName').value.trim().toLowerCase();
    const alias = document.getElementById('formAlias').value.trim();
    const pos = document.getElementById('formPosition').value;

    if (action === 'save') {
        if (!name || !alias) return alert("Please fill Name and Alias.");
        if (orig && orig !== name) delete staffMap[orig];
        staffMap[name] = { alias, area: pos.includes("BAR") ? "Bar" : "Sala", position: pos, priority: POSITION_ORDER[pos] || 99 };
    } else {
        delete staffMap[orig];
    }
    
    closeStaffModal(); 
    const list = Object.keys(staffMap).map(k => [k.toUpperCase(), staffMap[k].area, staffMap[k].position, staffMap[k].alias]);
    
    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "updateStaff", staffList: list }) })
    .then(() => { 
        alert("Synced to Cloud"); 
        loadData(); 
    });
}

// --- 4. BRIEFING LOGIC (The Fixed Part) ---
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if(!day) return alert("Choose a date");

    const renderItems = (list, area) => list.sort((a,b) => a.priority - b.priority).map((s, i) => `
        <div style="background:#fff; padding:10px; border-radius:10px; margin-bottom:10px; border-left:4px solid #7a4f2c">
            <div><strong>${s.displayName}</strong> (${s.shiftRaw})</div>
            <input type="text" placeholder="Task..." style="width:100%; margin-top:5px; border:1px solid #ddd; padding:5px; border-radius:5px;" onchange="updateTask('${date}','${area}',${i},this.value)">
        </div>`).join('');

    document.getElementById('modalResult').innerHTML = `
        <h3 style="color:#7a4f2c">${date}</h3>
        <p style="font-weight:bold; margin:10px 0 5px;">BAR TEAM</p>
        ${renderItems(day.Bar, 'Bar')}
        <p style="font-weight:bold; margin:15px 0 5px;">SALA TEAM</p>
        ${renderItems(day.Sala, 'Sala')}
    `;
    // Explicitly open the BRIEFING modal, not the STAFF modal
    document.getElementById('modal').style.display = 'flex';
}

function updateTask(date, area, index, value) {
    scheduleData[date][area][index].task = value;
}

function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    let text = `*ZENITH BRIEFING - ${date}*\n\n*BAR TEAM:*\n` + day.Bar.map(s => `• ${s.displayName}: ${s.task || ''}`).join('\n') + `\n\n*SALA TEAM:*\n` + day.Sala.map(s => `• ${s.displayName}: ${s.task || ''}`).join('\n');
    navigator.clipboard.writeText(text).then(() => alert("Copied for WhatsApp!"));
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// --- 5. INITIALIZE ---
function confirmSave() { if(confirm("Save and Sync?")) processCRUD('save'); }
function confirmDelete() { if(confirm("Permanently delete?")) processCRUD('delete'); }
window.onload = loadData;
