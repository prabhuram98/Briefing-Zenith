/**
 * Zenith Manager v1.8 - app.js
 * Core logic for data fetching, staff management, and schedule processing.
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

// Global variables attached to window for cross-file accessibility
window.scheduleData = {}; 
let staffMap = {}; 

/**
 * Page Navigation
 */
function openPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    // Refresh data whenever a sub-page is opened to ensure accuracy
    loadData().then(() => {
        if (id === 'editStaffPage') renderStaffList();
        if (id === 'showStaffPage') showStaffTable();
    });
}

/**
 * Data Fetching (Staff Directory + Schedule)
 */
async function loadData() {
    return new Promise((resolve) => {
        // Step 1: Load Staff Directory
        Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
            download: true,
            complete: (results) => {
                staffMap = {}; 
                let posSet = new Set();
                
                results.data.forEach((row, i) => {
                    if (i === 0 || !row[0]) return;
                    const name = row[0].toLowerCase().trim();
                    staffMap[name] = { 
                        alias: row[3] || row[0], 
                        area: row[1] || 'Sala', 
                        position: row[2] || 'Staff' 
                    };
                    posSet.add(row[2] || 'Staff');
                });

                // Update Position Dropdown in Modal
                const posDropdown = document.getElementById('formPosition');
                if(posDropdown) {
                    posDropdown.innerHTML = Array.from(posSet).sort()
                        .map(p => `<option value="${p}">${p}</option>`).join('');
                }

                // Step 2: Load Schedule
                Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
                    download: true,
                    complete: (sResults) => {
                        processSchedule(sResults.data);
                        resolve();
                    }
                });
            }
        });
    });
}

/**
 * Schedule Processor
 * Matches names from schedule with Staff Map metadata
 */
function processSchedule(rows) {
    const dates = {}; 
    const header = rows[0]; 
    let dateCols = [];

    // Identify Date Columns (skipping "Total" columns)
    for (let j = 1; j < header.length; j++) {
        if (header[j] && !header[j].toLowerCase().includes("total")) {
            const d = header[j].trim(); 
            dateCols.push({ index: j, label: d }); 
            dates[d] = [];
        }
    }

    // Map Staff to specific dates and shifts
    for (let i = 1; i < rows.length; i++) {
        let name = rows[i][0]?.toString().toLowerCase().trim();
        if (!name || !staffMap[name]) continue;

        dateCols.forEach(col => {
            let shift = rows[i][col.index]?.toString().trim();
            // Only add if there is a number (time) and not marked as OFF
            if (shift && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                dates[col.label].push({ 
                    ...staffMap[name], 
                    fullName: name, 
                    shiftRaw: shift 
                });
            }
        });
    }

    // CRITICAL: Set global variable for briefing.js
    window.scheduleData = dates; 
    console.log("Schedule Data Sync Complete.");
    updateDropdowns();
}

/**
 * UI Sync: Dropdowns
 */
function updateDropdowns() {
    const keys = Object.keys(window.scheduleData);
    if(keys.length > 0) {
        const opt = keys.map(k => `<option value="${k}">${k}</option>`).join('');
        const d1 = document.getElementById('dateSelect'); // For Briefing
        const d2 = document.getElementById('manageDateSelect'); // For Daily View
        if(d1) d1.innerHTML = opt;
        if(d2) d2.innerHTML = opt;
    }
}

/**
 * UI Sync: Daily View Table
 */
function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = window.scheduleData[date] || [];
    const container = document.getElementById('scheduleTableWrapper');
    
    if (day.length === 0) { 
        container.innerHTML = "<p style='padding:20px;'>No shifts found for this date.</p>"; 
        return; 
    }

    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Staff</th>
                        <th>Area</th>
                        <th>Shift</th>
                    </tr>
                </thead>
                <tbody>
                    ${day.map(s => `
                        <tr>
                            <td><b>${s.alias}</b></td>
                            <td>${s.area}</td>
                            <td>${s.shiftRaw}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

/**
 * Staff Directory Management
 */
function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    const sorted = Object.keys(staffMap).sort();
    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Alias</th>
                        <th>Pos</th>
                        <th>✎</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(k => `
                        <tr onclick="openStaffForm('${k}')">
                            <td><b>${staffMap[k].alias}</b></td>
                            <td>${staffMap[k].position}</td>
                            <td style="color:#dbc9b7">✎</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
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

function closeStaffModal() { 
    document.getElementById('staffModal').style.display = 'none'; 
}

/**
 * Database Operations (POST to Google Apps Script)
 */
async function confirmSave() {
    const fullName = document.getElementById('formFullName').value.trim().toUpperCase();
    const alias = document.getElementById('formAlias').value.trim();
    const pos = document.getElementById('formPosition').value;
    const key = document.getElementById('editOriginalKey').value;
    
    if (!fullName || !alias) return alert("Please fill in Name and Alias.");
    
    try {
        await fetch(SCRIPT_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ 
                action: key ? 'update' : 'add', 
                originalKey: key, 
                fullName, 
                alias, 
                position: pos, 
                area: staffMap[key?.toLowerCase()]?.area || 'Sala' 
            }) 
        });
        closeStaffModal(); 
        loadData();
    } catch (e) { 
        alert("Network error. Could not save."); 
    }
}

async function confirmDelete() {
    const key = document.getElementById('editOriginalKey').value;
    if (!confirm(`Delete ${key}? This cannot be undone.`)) return;
    try {
        await fetch(SCRIPT_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify({ action: 'delete', originalKey: key }) 
        });
        closeStaffModal(); 
        loadData();
    } catch (e) { 
        alert("Error deleting record."); 
    }
}

// Initial Load
window.onload = loadData;
