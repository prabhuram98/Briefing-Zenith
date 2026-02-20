const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

// Global Data Storage
let staffMap = {}; 
let scheduleData = {}; 
let uniquePositions = new Set();

// Hierarchy rules for sorting
const POSITION_ORDER = { 
    "MANAGER": 1, 
    "BAR MANAGER": 2, 
    "HEAD SELLER": 3, 
    "BAR STAFF": 4, 
    "SALA STAFF": 5, 
    "STAFF": 6 
};

// --- CORE DATA LOADING ---
// This function is the "Brain". It fetches staff first, then schedule.
async function loadData() {
    const btn = document.getElementById('refreshBtn');
    if(btn) btn.classList.add('spinning');
    
    // 1. Fetch Staff Directory
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            staffMap = {}; 
            uniquePositions.clear();
            
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return; // Skip header
                const key = row[0].trim().toLowerCase();
                const pos = row[2] ? row[2].trim().toUpperCase() : "STAFF";
                
                uniquePositions.add(pos);
                staffMap[key] = { 
                    alias: row[3] || row[0], 
                    area: (row[1] || '').toLowerCase().includes('bar') ? 'Bar' : 'Sala', 
                    position: pos, 
                    priority: POSITION_ORDER[pos] || 99 
                };
            });

            // Populate the Position Dropdown in the CRUD form
            const sortedPos = Array.from(uniquePositions).sort();
            const posSelect = document.getElementById('formPosition');
            if(posSelect) {
                posSelect.innerHTML = sortedPos.map(p => `<option value="${p}">${p}</option>`).join('');
            }

            // 2. NOW Load Schedule (only after staff names are known)
            loadSchedule();
            
            if(btn) btn.classList.remove('spinning');
            if(document.getElementById('editStaffPage').classList.contains('active')) renderStaffList();
        }
    });
}

function loadSchedule() {
    Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            const dates = {}; 
            const rows = results.data;
            if (rows.length < 1) return;
            
            const header = rows[0]; 
            let dateCols = [];

            // Map the Date Columns
            for (let j = 1; j < header.length; j++) {
                if (header[j] && !header[j].toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: header[j].trim() });
                    dates[header[j].trim()] = { Sala: [], Bar: [] };
                }
            }

            // Map Rows to Staff
            for (let i = 1; i < rows.length; i++) {
                let name = rows[i][0]?.trim();
                if (!name || name.toLowerCase() === "name") continue;

                // Match with staff directory
                const info = staffMap[name.toLowerCase()] || { 
                    alias: name, 
                    area: 'Sala', 
                    position: 'STAFF', 
                    priority: 99 
                };

                dateCols.forEach(col => {
                    let shift = rows[i][col.index]?.trim();
                    // Regex: check if string contains a number (the hours)
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
            
            // Update the UI Dropdowns
            const dateKeys = Object.keys(dates);
            if(dateKeys.length > 0) {
                const optHtml = dateKeys.map(k => `<option value="${k}">${k}</option>`).join('');
                document.getElementById('dateSelect').innerHTML = optHtml;
                document.getElementById('manageDateSelect').innerHTML = optHtml;
                
                // Refresh table if view is open
                if(document.getElementById('showStaffPage').classList.contains('active')) showStaffTable();
            }
        }
    });
}

// ---
