// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzOQSfjL_ha6xDj1D9_qmbiFqpbnUCyh76OacM90nS8d06W_8TxGv_0BiJd-NKEaBte5Q/exec';
const SCHEDULE_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ53rk57QQry1NKD6vCmGvVLdmS3t5A1jdAlK2jGuPWGyI9p7deBTTmro0ecJ6ITUB1egChi1PLaVyb/pub?gid=562624639&single=true&output=csv';
const STAFF_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ53rk57QQry1NKD6vCmGvVLdmS3t5A1jdAlK2jGuPWGyI9p7deBTTmro0ecJ6ITUB1egChi1PLaVyb/pub?gid=581286590&single=true&output=csv';

let staffDB = [];
let scheduleData = {};

// --- INITIALIZE ---
window.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
    // 1. Fetch Staff from Google Sheet CSV
    Papa.parse(STAFF_CSV_URL, {
        download: true,
        complete: function(results) {
            staffDB = results.data.map(r => ({ name: r[0]?.trim(), area: r[1]?.trim() })).filter(s => s.name);
            renderStaffList();
            
            // 2. Fetch Schedule after Staff is loaded
            Papa.parse(SCHEDULE_CSV_URL, {
                download: true,
                complete: function(res) { processSchedule(res.data); }
            });
        }
    });
}

// --- NAVIGATION ---
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(pageId + 'Page').classList.add('active');
    document.getElementById('pageTitle').innerText = pageId.toUpperCase();
    const idx = (pageId === 'briefing') ? 0 : 1;
    document.querySelectorAll('.nav-item')[idx].classList.add('active');
}

// --- MANAGE STAFF (WRITE) ---
async function submitNewStaff() {
    const name = document.getElementById('newStaffName').value.trim();
    const area = document.getElementById('newStaffArea').value;
    const btn = document.getElementById('addBtn');

    if (!name) return alert("Enter a name");
    
    btn.disabled = true;
    btn.innerText = "Saving...";

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Essential for Google Scripts
            body: JSON.stringify({ action: 'add', name: name, area: area })
        });
        alert("Added! Refreshing...");
        setTimeout(loadData, 2000); // Wait for Google to update
    } catch (e) {
        alert("Error saving staff");
    } finally {
        btn.disabled = false;
        btn.innerText = "Save to Cloud";
        document.getElementById('newStaffName').value = "";
    }
}

async function deleteStaff(name) {
    if (!confirm(`Remove ${name} from database?`)) return;

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'delete', name: name })
        });
        alert("Deleting... list will refresh.");
        setTimeout(loadData, 2000);
    } catch (e) {
        alert("Delete failed");
    }
}

function renderStaffList() {
    const container = document.getElementById('staffListView');
    container.innerHTML = staffDB.map(s => `
        <div class="staff-row">
            <span><strong>${s.name}</strong> <small>(${s.area})</small></span>
            <button class="del-btn" onclick="deleteStaff('${s.name}')">✕</button>
        </div>
    `).join('');
}

// --- BRIEFING LOGIC ---
function processSchedule(rows) {
    const newData = {};
    const header = rows[2] || [];
    const dateCols = [];
    header.forEach((cell, idx) => { if(cell && cell.includes('/')) dateCols.push({idx, date: cell}); });

    rows.forEach(row => {
        if (row[1] === 'H/W' && row[2]) {
            const name = row[2].trim().toLowerCase();
            const dbMatch = staffDB.find(s => s.name.toLowerCase() === name);
            if (dbMatch) {
                dateCols.forEach(c => {
                    const times = row[c.idx]?.match(/(\d{1,2}[:.]\d{2})[-: ]+(\d{1,2}[:.]\d{2})/);
                    if (times) {
                        if (!newData[c.date]) newData[c.date] = { Sala: [], Bar: [] };
                        newData[c.date][dbMatch.area].push({ name: dbMatch.name, entry: times[1].replace('.',':'), exit: times[2].replace('.',':') });
                    }
                });
            }
        }
    });
    scheduleData = newData;
    const sel = document.getElementById('dateSelect');
    sel.innerHTML = Object.keys(scheduleData).map(d => `<option value="${d}">${d}</option>`).join('');
}

document.getElementById('generateBtn').onclick = () => {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if(!day) return alert("Data still loading or date not found.");

    const sEntry = [...day.Sala].sort((a,b) => a.entry.localeCompare(b.entry));
    const bEntry = [...day.Bar].sort((a,b) => a.entry.localeCompare(b.entry));
    const sExit = [...day.Sala].sort((a,b) => a.exit.localeCompare(b.exit));
    const bExit = [...day.Bar].sort((a,b) => a.exit.localeCompare(b.exit));

    const porta = day.Sala.find(s => s.name.toLowerCase() === 'ana') || sEntry[0];

    let t = `BRIEFING ( ${date} )\n\n`;
    t += `${porta?.entry || '--'} Porta: ${porta?.name || 'TBD'}\n\n`;
    
    t += `BAR:\n`;
    bEntry.forEach((b, i) => {
        const labs = ["(Caixa)", "(Smoothies)", "(Smoothies)", "(Cafés)"];
        t += `${b.entry} Bar ${labs[i] || ''}: ${b.name}\n`;
    });

    t += `\nSELLERS:\n`;
    const sellers = sEntry.filter(s => s.name !== porta?.name);
    sellers.forEach((s, i) => {
        t += `${s.entry} Seller ${String.fromCharCode(65+i)}: ${s.name}\n`;
    });

    t += `\nFECHO:\n`;
    t += `${bExit[bExit.length-1]?.exit || '--'} Fecho Bar: ${bExit[bExit.length-1]?.name || ''}\n`;
    t += `${sExit[sExit.length-1]?.exit || '--'} Fecho Sala: ${sExit[sExit.length-1]?.name || ''}\n`;

    document.getElementById('briefingText').textContent = t;
    document.getElementById('briefingPopup').style.display = 'flex';
    document.getElementById('briefingText').scrollTop = 0;
};

// UI BUTTONS
document.getElementById('closeBtn').onclick = () => document.getElementById('briefingPopup').style.display = 'none';
document.getElementById('copyBtn').onclick = () => {
    navigator.clipboard.writeText(document.getElementById('briefingText').textContent);
    alert("Copied to clipboard!");
};
