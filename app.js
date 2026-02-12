// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=0&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSKuZ37JznuRBr5xNhzky3jZ83-3EoZVqjlHS8qXeGcU3J1mZ5K3tPS59FH90eSZxl65G9O8DwNmPrk/pub?output=csv';

let staffData = [];        // Clean list of staff {name, area}
let scheduleData = {};     // Grouped by Date: { "12/02": { Sala: [], Bar: [] } }
let employeeSchedules = {}; // Grouped by Name: { "John": [ {date, shift}, ... ] }

// --- NAVIGATION ---
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId + 'Page').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('pageTitle').innerText = pageId.toUpperCase();
}

// --- DATA LOADING ---
async function loadStaff() {
    const timestamp = new Date().getTime();
    const freshUrl = `${STAFF_URL}${STAFF_URL.includes('?') ? '&' : '?'}t=${timestamp}`;
    
    Papa.parse(freshUrl, {
        download: true,
        complete: (results) => {
            staffData = results.data
                .filter(r => r[0] && r[0].trim() !== "" && r[0].toLowerCase() !== "name")
                .map(r => ({ 
                    name: r[0].trim(), 
                    area: (r[1] && r[1].trim().toLowerCase() === 'bar') ? 'Bar' : 'Sala' 
                }));
            loadSchedule(); // Load schedule after staff is ready
        }
    });
}

function loadSchedule() {
    const timestamp = new Date().getTime();
    const freshUrl = `${SCHEDULE_URL}${SCHEDULE_URL.includes('?') ? '&' : '?'}t=${timestamp}`;

    Papa.parse(freshUrl, {
        download: true,
        complete: (results) => {
            const rows = results.data;
            if (!rows || rows.length < 1) return;

            const dates = {};
            const empSchedules = {};
            let dateCols = [];
            
            // 1. Map Dates from Header
            const headerRow = rows[0]; 
            for (let j = 3; j < headerRow.length; j++) {
                let cellValue = headerRow[j] ? headerRow[j].trim() : "";
                if (cellValue !== "") {
                    dateCols.push({ index: j, label: cellValue });
                    dates[cellValue] = { Sala: [], Bar: [] };
                }
            }

            // 2. Process Rows
            for (let i = 1; i < rows.length; i++) {
                let nameInSheet = rows[i][2] ? rows[i][2].trim() : "";
                if (!nameInSheet) continue;

                const employee = staffData.find(s => s.name.toLowerCase() === nameInSheet.toLowerCase());
                const role = employee ? employee.area : 'Sala';
                
                empSchedules[nameInSheet] = [];

                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].trim() : "";
                    
                    if (shift !== "" && !["OFF", "FOLGA", "F", "-"].includes(shift.toUpperCase())) {
                        // For the Daily Briefing
                        let startTime = shift.split('-')[0].trim().replace('.', ':');
                        dates[col.label][role].push({
                            name: employee ? employee.name : nameInSheet,
                            time: startTime,
                            task: ""
                        });

                        // For the Individual List
                        empSchedules[nameInSheet].push({ date: col.label, shift: shift });
                    }
                });
            }

            // 3. Sort Daily Briefings by Time
            Object.keys(dates).forEach(d => {
                dates[d].Sala.sort((a, b) => a.time.localeCompare(b.time));
                dates[d].Bar.sort((a, b) => a.time.localeCompare(b.time));
            });

            scheduleData = dates;
            employeeSchedules = empSchedules;
            updateDateDropdown(Object.keys(dates));
            renderStaffSchedules();
        }
    });
}

// --- UI RENDERING ---
function updateDateDropdown(dateKeys) {
    const sel = document.getElementById('dateSelect');
    sel.innerHTML = dateKeys.length 
        ? dateKeys.map(d => `<option value="${d}">${d}</option>`).join('')
        : '<option>No dates found...</option>';
}

function renderStaffSchedules() {
    const list = document.getElementById('staffList');
    let html = "";
    
    for (const [name, shifts] of Object.entries(employeeSchedules)) {
        html += `
            <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
                <strong>${name}</strong>
                <div style="font-size: 13px; color: #666; margin-top:4px;">
                    ${shifts.length ? shifts.map(s => `• ${s.date}: ${s.shift}`).join('<br>') : 'No shifts'}
                </div>
            </div>`;
    }
    list.innerHTML = html || "No staff found.";
}

function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if (!day) return;

    const renderRows = (list, area) => list.map((s, i) => `
        <div style="display:flex; gap:10px; margin-bottom:12px; align-items:center;">
            <div style="min-width:140px; font-size: 14px;">
                <span style="color:#666;">${s.time}</span> <strong>${s.name}</strong>
            </div>
            <input type="text" placeholder="Tarefa..." 
                onchange="updateTask('${date}','${area}',${i},this.value)" 
                style="flex-grow:1; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>`).join('');

    let html = `<h2 style="margin-bottom:20px;">Briefing: ${date}</h2>`;
    html += `<div style="background:#fdf2f2; padding:15px; border-radius:8px; margin-bottom:15px;">
                <h4 style="margin-top:0; color:#d9534f;">BAR</h4>
                ${day.Bar.length ? renderRows(day.Bar, 'Bar') : "Sem staff"}
             </div>`;
    html += `<div style="background:#f2f7fd; padding:15px; border-radius:8px;">
                <h4 style="margin-top:0; color:#337ab7;">SALA</h4>
                ${day.Sala.length ? renderRows(day.Sala, 'Sala') : "Sem staff"}
             </div>`;

    document.getElementById('briefingResult').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
}

function updateTask(date, area, index, value) {
    scheduleData[date][area][index].task = value;
}

function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    let text = `*ZENITH BRIEFING - ${date.toUpperCase()}*\n\n*BAR:*\n`;
    text += day.Bar.length ? day.Bar.map(s => `${s.time} ${s.name} ${s.task}`).join('\n') : "Sem staff";
    text += `\n\n*SALA:*\n`;
    text += day.Sala.length ? day.Sala.map(s => `${s.time} ${s.name} ${s.task}`).join('\n') : "Sem staff";
    navigator.clipboard.writeText(text).then(() => alert("Copiado!"));
}

async function handleAddStaff() {
    const name = document.getElementById('staffName').value;
    const area = document.getElementById('staffArea').value;
    if(!name) return alert("Enter name");
    
    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.innerText = "Saving...";

    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ name, area }) });
        alert("Sent to Sheet!");
        document.getElementById('staffName').value = "";
    } catch (e) { alert("Error saving"); }
    btn.disabled = false; btn.innerText = "Save to Google Sheets";
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
window.onload = loadStaff;
