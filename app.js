// app.js - Full Version with CRUD and Navigation
window.staffMap = {}; 
window.scheduleData = {}; 

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "RUNNER": 6, "STAFF": 7 };

// --- 1. NAVIGATION & CRUD MODALS (FIXED) ---
function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
        if (pageId === 'manageStaffPage') renderStaffList();
        if (pageId === 'dailyViewPage') renderDailyView();
    }
}

// THIS IS THE MISSING FUNCTION
function openStaffForm(name = '', area = 'Sala', pos = 'Staff', alias = '') {
    const modal = document.getElementById('modal');
    const resultArea = document.getElementById('modalResult');
    
    let html = `
        <div style="padding: 20px;">
            <h3>${name ? 'Edit' : 'Add New'} Staff</h3>
            <form id="staffForm" style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
                <label>Real Name (matches Schedule):</label>
                <input type="text" id="formName" value="${name}" ${name ? 'readonly' : ''} required>
                
                <label>Alias (for Briefing):</label>
                <input type="text" id="formAlias" value="${alias || name}" required>
                
                <label>Department:</label>
                <select id="formArea">
                    <option value="Sala" ${area === 'Sala' ? 'selected' : ''}>Sala</option>
                    <option value="Bar" ${area === 'Bar' ? 'selected' : ''}>Bar</option>
                </select>
                
                <label>Position:</label>
                <select id="formPos">
                    ${Object.keys(POSITION_ORDER).map(p => `<option value="${p}" ${pos === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
                
                <button type="button" onclick="saveStaffEntry()" style="margin-top: 10px; padding: 10px; background: #28a745; color: white; border: none;">Save Staff</button>
            </form>
        </div>
    `;
    
    resultArea.innerHTML = html;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// --- 2. DATA HANDLING ---
async function loadData() {
    const syncIcons = document.querySelectorAll('.sync-small');
    syncIcons.forEach(i => i.classList.add('spinning'));
    
    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: function(results) {
            window.staffMap = {}; 
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const rawName = row[0].toString().toLowerCase().trim();
                const area = row[1] ? row[1].toString().trim() : "Sala";
                const pos = row[2] ? row[2].toString().trim().toUpperCase() : "STAFF";
                const alias = row[3] ? row[3].toString().trim() : row[0].trim();
                window.staffMap[rawName] = { 
                    name: row[0].trim(),
                    alias: alias, 
                    area: area, 
                    position: pos 
                };
            });
            loadSchedule(syncIcons);
        }
    });
}

// --- 3. RENDERING VIEWS ---
function renderStaffList() {
    const listDiv = document.getElementById('staffListContainer');
    if (!listDiv) return;
    
    let html = `
        <div style="display:flex; justify-content: space-between; align-items: center;">
            <h3>Staff Directory</h3>
            <button onclick="openStaffForm()" style="padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 4px;">+ Add Staff</button>
        </div>
        <table style="width:100%; border-collapse: collapse; margin-top:10px;">
            <tr style="background:#eee; text-align:left;">
                <th>Alias</th><th>Dept</th><th>Role</th><th>Action</th>
            </tr>`;
            
    Object.values(window.staffMap).forEach(s => {
        html += `
            <tr style="border-bottom:1px solid #ddd;">
                <td>${s.alias}</td>
                <td>${s.area}</td>
                <td>${s.position}</td>
                <td><button onclick="openStaffForm('${s.name}', '${s.area}', '${s.position}', '${s.alias}')">Edit</button></td>
            </tr>`;
    });
    html += '</table>';
    listDiv.innerHTML = html;
}

// --- 4. DATA SAVING (CRUD) ---
async function saveStaffEntry() {
    const data = {
        action: 'upsertStaff',
        name: document.getElementById('formName').value,
        alias: document.getElementById('formAlias').value,
        area: document.getElementById('formArea').value,
        position: document.getElementById('formPos').value
    };

    const btn = document.querySelector('#staffForm button');
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        alert("Staff updated! (Allow a few seconds for Google Sheets to sync)");
        closeModal();
        loadData();
    } catch (e) {
        alert("Error saving: " + e);
        btn.disabled = false;
        btn.innerText = "Save Staff";
    }
}

// (Include the previously sent generateBriefing and loadSchedule functions here)

window.onload = loadData;
