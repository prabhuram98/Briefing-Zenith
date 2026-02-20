const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
let rawRows = [];      

async function loadData() {
    const timestamp = new Date().getTime();
    Papa.parse(`${STAFF_URL}&t=${timestamp}`, {
        download: true,
        complete: (results) => {
            // Build Area Map: { "ana": "sala", "carlos": "bar" }
            results.data.forEach(r => {
                if(r[0] && r[0].trim() !== "") {
                    let name = r[0].trim().toLowerCase();
                    let area = (r[1] && r[1].toLowerCase().includes('bar')) ? 'Bar' : 'Sala';
                    staffMap[name] = area;
                }
            });
            loadSchedule();
        }
    });
}

function loadSchedule() {
    const timestamp = new Date().getTime();
    Papa.parse(`${SCHEDULE_URL}&t=${timestamp}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            rawRows = results.data;
            if (!rawRows || rawRows.length < 2) return;

            const dates = {};
            const headerRow = rawRows[0]; // Dates in Row 1
            let dateCols = [];

            // 1. Identify Date Columns
            for (let j = 1; j < headerRow.length; j++) {
                let label = headerRow[j] ? headerRow[j].trim() : "";
                if (label !== "" && !label.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: label });
                    dates[label] = { Sala: [], Bar: [] };
                }
            }

            // 2. Process Every Row starting from Index 1
            for (let i = 1; i < rawRows.length; i++) {
                let nameInSheet = rawRows[i][0] ? rawRows[i][0].trim() : "";
                
                // Skip if Column A is empty or says "Name"
                if (!nameInSheet || nameInSheet.toLowerCase() === "name") continue;

                // Match Role (Default to Sala if not found in Staff tab)
                const role = staffMap[nameInSheet.toLowerCase()] || 'Sala';

                dateCols.forEach(col => {
                    let shift = rawRows[i][col.index] ? rawRows[i][col.index].trim() : "";
                    
                    // VALIDATION: Does it look like a shift?
                    const isOff = ["OFF", "FOLGA", "FÉRIAS", "BAIXA", "-", ""].includes(shift.toUpperCase());
                    const hasData = shift.length > 1;

                    if (hasData && !isOff) {
                        let parts = shift.split(/[- ]+/);
                        dates[col.label][role].push({
                            name: nameInSheet,
                            time: parts[0] ? parts[0].replace('.', ':') : "--:--",
                            endTime: parts[1] ? parts[1].replace('.', ':') : "--:--",
                            task: ""
                        });
                    }
                });
            }

            scheduleData = dates;
            updateDropdowns(Object.keys(dates));
        }
    });
}

function updateDropdowns(keys) {
    const options = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    document.getElementById('dateSelect').innerHTML = options;
    document.getElementById('manageDateSelect').innerHTML = options;
}

function showStaffTable() {
    const selectedDate = document.getElementById('manageDateSelect').value;
    const wrapper = document.getElementById('scheduleTableWrapper');
    const headerRow = rawRows[0];
    
    // Find the correct column index for the selected date
    const colIdx = headerRow.findIndex(cell => cell && cell.trim() === selectedDate);
    if (colIdx === -1) return;

    document.getElementById('staffTableContainer').style.display = 'block';
    document.getElementById('tableHeaderDate').innerText = selectedDate;

    let html = `<div class="staff-grid-header"><span>NAME</span><span>AREA</span><span>HOURS</span></div>`;
    let count = 0;

    for (let i = 1; i < rawRows.length; i++) {
        let name = rawRows[i][0] ? rawRows[i][0].trim() : "";
        let shift = rawRows[i][colIdx] ? rawRows[i][colIdx].trim() : "";

        const isOff = ["OFF", "FOLGA", "FÉRIAS", "BAIXA", "-", ""].includes(shift.toUpperCase());

        if (name && name.toLowerCase() !== 'name' && !isOff) {
            count++;
            const area = (staffMap[name.toLowerCase()] || 'SALA').toUpperCase();
            const areaClass = area === 'BAR' ? 'tag-bar' : 'tag-sala';
            html += `
                <div class="staff-row">
                    <div class="staff-name">${name}</div>
                    <div class="staff-area"><span class="area-tag ${areaClass}">${area}</span></div>
                    <div class="staff-hours">${shift}</div>
                </div>`;
        }
    }
    wrapper.innerHTML = count > 0 ? html : "<p style='text-align:center; padding:20px;'>No active shifts found.</p>";
}

// NAVIGATION & MODALS
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId + 'Page').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('pageTitle').innerText = pageId.toUpperCase();
}
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if(!day) return;
    const render = (list, area) => list.map((s, i) => `
        <div class="briefing-item">
            <div class="briefing-info"><strong>${s.name}</strong> (${s.time}-${s.endTime})</div>
            <input type="text" placeholder="Task..." onchange="updateTask('${date}','${area}',${i},this.value)">
        </div>`).join('');
    document.getElementById('modalResult').innerHTML = `
        <h2 style="color:#7a4f2c;">${date}</h2>
        <h4 style="color:#d9534f;">BAR</h4>${day.Bar.length ? render(day.Bar, 'Bar') : 'None'}
        <h4 style="color:#337ab7; margin-top:15px;">SALA</h4>${day.Sala.length ? render(day.Sala, 'Sala') : 'None'}`;
    document.getElementById('modal').style.display = 'flex';
}
function updateTask(date, area, index, val) { if(scheduleData[date]) scheduleData[date][area][index].task = val; }
function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    let txt = `*ZENITH BRIEFING - ${date}*\n\n*BAR:*\n` + 
              (day.Bar.map(s => `• ${s.name} (${s.time}-${s.endTime}) ${s.task || ''}`).join('\n') || "None") + 
              `\n\n*SALA:*\n` + 
              (day.Sala.map(s => `• ${s.name} (${s.time}-${s.endTime}) ${s.task || ''}`).join('\n') || "None");
    navigator.clipboard.writeText(txt).then(() => alert("Copied!"));
}
function closeModal() { document.getElementById('modal').style.display = 'none'; }
function closeStaffTable() { document.getElementById('staffTableContainer').style.display = 'none'; }
window.onload = loadData;
