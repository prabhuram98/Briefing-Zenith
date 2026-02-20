// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
let uniquePositions = new Set();
const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "STAFF": 6 };

// --- 1. LOAD STAFF (The Dictionary) ---
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
                
                // FORCE LOWERCASE & TRIM for the lookup key
                const rawName = row[0].toString().toLowerCase().trim();
                const area = row[1] ? row[1].toString().trim() : "Sala";
                const pos = row[2] ? row[2].toString().trim().toUpperCase() : "STAFF";
                const alias = row[3] ? row[3].toString().trim() : row[0].trim();
                
                uniquePositions.add(pos);
                staffMap[rawName] = { 
                    alias: alias, 
                    area: area.toLowerCase().includes('bar') ? 'Bar' : 'Sala', 
                    position: pos, 
                    priority: POSITION_ORDER[pos] || 99 
                };
            });

            const sortedPos = Array.from(uniquePositions).sort();
            document.getElementById('formPosition').innerHTML = sortedPos.map(p => `<option value="${p}">${p}</option>`).join('');

            // Chain to schedule
            loadSchedule(btn);
        }
    });
}

// --- 2. LOAD SCHEDULE (The Calendar) ---
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
                let nameInSchedule = rows[i][0] ? rows[i][0].toString().toLowerCase().trim() : "";
                if (!nameInSchedule || nameInSchedule === "name") continue;

                // Lookup in staffMap using the lowercase name
                const info = staffMap[nameInSchedule] || { 
                    alias: nameInSchedule.toUpperCase(), // fallback to original if not found
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
                showStaffTable();
            }

            if(refreshBtn) refreshBtn.classList.remove('spinning');
        }
    });
}

// --- 3. UI RENDERING ---
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

function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    const sortedKeys = Object.keys(staffMap).sort((a,b) => staffMap[a].priority - staffMap[b].priority);
    container.innerHTML = sortedKeys.map(k => `
        <div class="staff-edit-card" onclick="openStaffForm('${k}')">
            <div><strong>${staffMap[k].alias}</strong><br><span class="role-subtitle">${staffMap[k].position}</span></div>
            <div style="color:#7a4f2c">✏️</div>
        </div>`).join('');
}

// --- 4. CRUD & MODALS ---
function openStaffForm(key = null) {
    const delBtn = document.getElementById('deleteBtn');
    if (key) {
        const s = staffMap
