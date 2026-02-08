// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=0&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=609693221&single=true&output=csv';


let staffData = [];
let scheduleData = {};

// --- 1. INITIALIZE: LOAD STAFF ROLES FIRST ---
async function loadStaff() {
    console.log("Fetching Staff Roles...");
    const freshStaffUrl = STAFF_URL + (STAFF_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
    
    Papa.parse(freshStaffUrl, {
        download: true,
        complete: (results) => {
            staffData = results.data
                .filter(r => r[0] && !['name', 'nome'].includes(r[0].toLowerCase().trim()))
                .map(r => ({ 
                    name: r[0].trim(), 
                    area: r[1] ? r[1].trim() : 'Sala' 
                }));
            renderStaffList();
            loadSchedule(); // Load schedule only after we know the roles
        }
    });
}

// --- 2. LOAD SCHEDULE: DATES (ROW 1) & STAFF (COL C) ---
function loadSchedule() {
    console.log("Fetching Schedule...");
    const freshScheduleUrl = SCHEDULE_URL + (SCHEDULE_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();

    Papa.parse(freshScheduleUrl, {
        download: true,
        complete: (results) => {
            const dates = {};
            const rows = results.data;
            if (!rows || rows.length < 1) return;

            // STEP A: Identify Dates in Row 1 (Starting Column D / Index 3)
            const row1 = rows[0] || [];
            const dateCols = [];
            for (let i = 3; i < row1.length; i++) {
                const dateVal = row1[i] ? row1[i].trim() : "";
                if (dateVal !== "") {
                    dateCols.push({ idx: i, date: dateVal });
                    dates[dateVal] = { Sala: [], Bar: [] }; // Prepare container for this date
                }
            }

            // STEP B: Identify Staff in Column C (Starting Row 3 / Index 2)
            for (let i = 2; i < rows.length; i++) {
                const row = rows[i];
                const nameInSheet = row[2] ? row[2].trim().toLowerCase() : "";

                if (nameInSheet !== "") {
                    // Find if this person is Sala or Bar from our master list
                    const match = staffData.find(s => s.name.toLowerCase() === nameInSheet);
                    const role = match ? match.area : 'Sala'; 
                    const displayName = match ? match.name : row[2].trim();

                    // Check their shifts across all identified dates
                    dateCols.forEach(c => {
                        let shift = row[c.idx] ? row[c.idx].trim() : "";
                        const isOff = ["OFF", "FOLGA", "F", "-", ""].includes(shift.toUpperCase());

                        if (!isOff && shift.length > 1) {
                            const startTime = shift.split('-')[0].trim();
                            dates[c.date][role].push({ 
                                name: displayName, 
                                in: startTime,
                                task: "" // To be filled by user in the app
                            });
                        }
                    });
                }
            }

            scheduleData = dates;
            updateDateDropdown(Object.keys(dates));
        }
    });
}

// --- 3. UI RENDERING ---

function updateDateDropdown(dateKeys) {
    const sel = document.getElementById('dateSelect');
    if (dateKeys.length > 0) {
        sel.innerHTML = dateKeys.map(d => `<option value="${d}">${d}</option>`).join('');
    } else {
        sel.innerHTML = '<option>Sem datas no ficheiro</option>';
    }
}

function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if (!day) return alert("Selecione uma data.");

    const sortTime = (a, b) => {
        const tA = parseFloat(a.in.replace(':', '.').replace(/[^0-9.]/g, '')) || 0;
        const tB = parseFloat(b.in.replace(':', '.').replace(/[^0-9.]/g, '')) || 0;
        return tA - tB;
    };

    const renderStaffRow = (s, area, idx) => `
        <div class="briefing-row" style="display:flex; gap:10px; margin-bottom:8px; align-items:center;">
            <span style="min-width:120px;"><strong>${s.in}</strong> - ${s.name}</span>
            <input type="text" placeholder="Atribuir tarefa..." 
                onchange="updateTask('${date}', '${area}', ${idx}, this.value)" 
                style="flex-grow:1; padding:5px; border:1px solid #ddd; border-radius:4px;">
        </div>
    `;

    let html = `<h2 style="margin-top:0;">${date}</h2>`;
    
    html += `<h4 style="color:#2c3e50; border-bottom:1px solid #eee;">BAR</h4>`;
    html += day.Bar.length ? day.Bar.sort(sortTime).map((s, i) => renderStaffRow(s, 'Bar', i)).join('') : "<p>_Sem staff_</p>";

    html += `<h4 style="color:#2c3e50; border-bottom:1px solid #eee; margin-top:20px;">SALA</h4>`;
    html += day.Sala.length ? day.Sala.sort(sortTime).map((s, i) => renderStaffRow(s, 'Sala', i)).join('') : "<p>_Sem staff_</p>";

    document.getElementById('briefingResult').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
}

function updateTask(date, area, index, value) {
    if(scheduleData[date] && scheduleData[date][area][index]) {
        scheduleData[date][area][index].task = value;
    }
}

function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    
    let text = `*ZENITH BRIEFING - ${date}*\n\n`;
    const formatLine = (s) => `• ${s.in} - ${s.name}${s.task ? ' -> *' + s.task + '*' : ''}`;

    text += `*BAR:*\n${day.Bar.map(formatLine).join('\n') || '_Vazio_'}\n\n`;
    text += `*SALA:*\n${day.Sala.map(formatLine).join('\n') || '_Vazio_'}`;

    navigator.clipboard.writeText(text).then(() => alert("Copiado com sucesso!"));
}

// --- 4. STAFF MANAGEMENT (MANAGE TAB) ---

function renderStaffList() {
    const listDiv = document.getElementById('staffList');
    if (!listDiv) return;
    listDiv.innerHTML = staffData.map(s => `
        <div class="staff-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span><strong>${s.name}</strong> (${s.area})</span>
            <button onclick="deleteStaff('${s.name}')" style="color:red; border:none; background:none; cursor:pointer;">✕</button>
        </div>
    `).join('') || "Lista vazia.";
}

async function handleAddStaff() {
    const nameInput = document.getElementById('staffName');
    const areaSelect = document.getElementById('staffArea');
    const name = nameInput.value.trim();
    if (!name) return;

    await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'add', name: name, area: areaSelect.value })
    });

    nameInput.value = "";
    setTimeout(loadStaff, 1500);
}

async function deleteStaff(name) {
    if(!confirm(`Apagar ${name}?`)) return;
    await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'delete', name: name })
    });
    setTimeout(loadStaff, 1500);
}

// --- NAVIGATION & MODAL ---
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId + 'Page').classList.add('active');
    btn.classList.add('active');
    document.getElementById('pageTitle').innerText = pageId.toUpperCase();
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

window.onload = loadStaff;
