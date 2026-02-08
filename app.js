// CONFIGURATION
const SCRIPT_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';
const SCHEDULE_URL = 'PASTE_SCHEDULE_CSV_HERE';
const STAFF_URL = 'PASTE_STAFF_CSV_HERE';

let staffData = [];
let scheduleData = {};

// NAVIGATION
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId + 'Page').classList.add('active');
    btn.classList.add('active');
    document.getElementById('pageTitle').innerText = pageId.toUpperCase();
}

// LOADING DATA
async function loadStaff() {
    Papa.parse(STAFF_URL, {
        download: true,
        complete: (results) => {
            staffData = results.data
                .filter(r => r[0] && r[0] !== "Name")
                .map(r => ({ name: r[0].trim(), area: r[1] || 'Sala' }));
            renderStaff();
            loadSchedule();
        }
    });
}

function loadSchedule() {
    Papa.parse(SCHEDULE_URL, {
        download: true,
        complete: (results) => {
            const dates = {};
            const header = results.data[0] || []; // Change to results.data[2] if dates are in Row 3
            const dateCols = [];
            
            header.forEach((cell, idx) => {
                if(cell && cell.includes('/')) dateCols.push({idx, date: cell});
            });

            results.data.forEach(row => {
                const name = row[2] ? row[2].trim().toLowerCase() : null;
                const staff = staffData.find(s => s.name.toLowerCase() === name);
                if (staff) {
                    dateCols.forEach(c => {
                        const timeMatch = row[c.idx]?.match(/(\d{1,2}[:.]\d{2})/g);
                        if (timeMatch) {
                            if (!dates[c.date]) dates[c.date] = { Sala: [], Bar: [] };
                            dates[c.date][staff.area].push({ name: staff.name, in: timeMatch[0] });
                        }
                    });
                }
            });
            scheduleData = dates;
            const sel = document.getElementById('dateSelect');
            sel.innerHTML = Object.keys(dates).map(d => `<option value="${d}">${d}</option>`).join('');
        }
    });
}

// ACTIONS
async function handleAddStaff() {
    const nameInput = document.getElementById('staffName');
    const area = document.getElementById('staffArea').value;
    const btn = document.getElementById('saveBtn');
    
    if (!nameInput.value.trim()) return alert("Enter Name");
    
    btn.disabled = true;
    btn.innerText = "Saving...";

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'add', name: nameInput.value.trim(), area: area })
        });
        alert("Success! Wait 2 seconds for update.");
        nameInput.value = "";
        setTimeout(loadStaff, 2000);
    } catch (e) {
        alert("Error connecting to Google.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Save to Google Sheets";
    }
}

function renderStaff() {
    const list = document.getElementById('staffList');
    list.innerHTML = staffData.length ? staffData.map(s => `
        <div class="staff-item">
            <span>${s.name} (${s.area})</span>
            <button onclick="deleteStaff('${s.name}')" style="color:red;border:none;background:none">✕</button>
        </div>
    `).join('') : "No staff found.";
}

async function deleteStaff(name) {
    if(!confirm("Delete " + name + "?")) return;
    await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'delete', name: name })
    });
    setTimeout(loadStaff, 2000);
}

function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if (!day) return alert("No schedule for this date.");

    let text = `*ZENITH BRIEFING - ${date}*\n\n`;
    text += `*BAR:*\n` + day.Bar.sort((a,b)=>a.in.localeCompare(b.in)).map(s=>`${s.in} - ${s.name}`).join('\n');
    text += `\n\n*SALA:*\n` + day.Sala.sort((a,b)=>a.in.localeCompare(b.in)).map(s=>`${s.in} - ${s.name}`).join('\n');

    document.getElementById('briefingResult').innerText = text;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
function copyText() {
    navigator.clipboard.writeText(document.getElementById('briefingResult').innerText);
    alert("Copied!");
}

window.onload = loadStaff;
