const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 

const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
let uniquePositions = new Set();
const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "STAFF": 6 };

// --- 1. THE BRAIN: LOADS DATA IN ORDER ---
async function loadData() {
    const btn = document.getElementById('refreshBtn');
    if(btn) btn.classList.add('spinning');
    
    // Fetch Staff First
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            staffMap = {}; 
            uniquePositions.clear();
            
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                // Normalize names: remove extra spaces and lowercase
                const nameKey = row[0].toString().trim().toLowerCase();
                const pos = row[2] ? row[2].trim().toUpperCase() : "STAFF";
                
                uniquePositions.add(pos);
                staffMap[nameKey] = { 
                    alias: row[3] || row[0], 
                    area: (row[1] || '').toLowerCase().includes('bar') ? 'Bar' : 'Sala', 
                    position: pos, 
                    priority: POSITION_ORDER[pos] || 99 
                };
            });

            // Update Form Dropdown
            const sortedPos = Array.from(uniquePositions).sort();
            document.getElementById('formPosition').innerHTML = sortedPos.map(p => `<option value="${p}">${p}</option>`).join('');

            // ONLY AFTER STAFF IS DONE, LOAD SCHEDULE
            loadSchedule(btn);
        }
    });
}

// --- 2. LOADS SCHEDULE AND MATCHES NAMES ---
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

            // Detect Date Columns
            for (let j = 1; j < header.length; j++) {
                if (header[j] && !header[j].toLowerCase().includes("total")) {
                    const dName = header[j].trim();
                    dateCols.push({ index: j, label: dName });
                    dates[dName] = { Sala: [], Bar: [] };
                }
            }

            // Process Rows
            for (let i = 1; i < rows.length; i++) {
                let rawName = rows[i][0]?.toString().trim();
                if (!rawName || rawName.toLowerCase() === "name") continue;

                // Match with Directory or Fallback
                const info = staffMap[rawName.toLowerCase()] || { 
                    alias: rawName, 
                    area: 'Sala', 
                    position: 'EXTERNAL', 
                    priority: 99 
                };

                dateCols.forEach(col => {
                    let shift = rows[i][col.index]?.toString().trim();
                    // Regex: check if string contains any number
                    if (shift && /\d/.test(shift) && !["OFF", "FOLGA", "FERIAS"].includes(shift.toUpperCase())) {
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
            
            // Populate Dropdowns
            const dateKeys = Object.keys(dates);
            if(dateKeys.length > 0) {
                const optHtml = dateKeys.map(k => `<option value="${k}">${k}</option>`).join('');
                document.getElementById('dateSelect').innerHTML = optHtml;
                document.getElementById('manageDateSelect').innerHTML = optHtml;
                
                // Refresh views
                showStaffTable();
                if(document.getElementById('editStaffPage').classList.contains('active')) renderStaffList();
            }

            if(refreshBtn) refreshBtn.classList.remove('spinning');
        }
    });
}

// --- 3. NAVIGATION & UI ---
function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'editStaffPage') renderStaffList();
    if (pageId === 'showStaffPage') showStaffTable();
}

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date];
    if(!day) {
        document.getElementById('scheduleTableWrapper').innerHTML = "<p style='text-align:center; padding:20px;'>No shifts found.</p>";
        return;
    }
    
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

// --- 4. CRUD OPERATIONS ---
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
        document.getElementById('formFullName').value = ""; document.getElementById('formAlias').value = "";
        delBtn.style.display = "none";
    }
    document.getElementById('staffModal').style.display = 'flex';
}

function confirmSave() { if (confirm("Sync to Cloud?")) processCRUD('save'); }
function confirmDelete() { if (confirm("Delete permanently?")) processCRUD('delete'); }

async function processCRUD(action) {
    const orig = document.getElementById('editOriginalKey').value;
    const name = document.getElementById('formFullName').value.trim().toLowerCase();
    const alias = document.getElementById('formAlias').value.trim();
    const pos = document.getElementById('formPosition').value;

    if (action === 'save') {
        if (!name || !alias) return alert("Fill Name and Alias");
        if (orig && orig !== name) delete staffMap[orig];
        staffMap[name] = { alias, area: pos.includes("BAR") ? "Bar" : "Sala", position: pos, priority: POSITION_ORDER[pos] || 99 };
    } else {
        delete staffMap[orig];
    }
    closeStaffModal(); 
    const list = Object.keys(staffMap).map(k => [k.toUpperCase(), staffMap[k].area, staffMap[k].position, staffMap[k].alias]);
    fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "updateStaff", staffList: list }) })
    .then(() => { alert("Cloud Synced!"); loadData(); });
}

// --- 5. HELPERS ---
function closeStaffModal() { document.getElementById('staffModal').style.display = 'none'; }
function closeModal() { document.getElementById('modal').style.display = 'none'; }
window.onload = loadData;
// ---
