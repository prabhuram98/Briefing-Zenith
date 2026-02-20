// --- CONFIGURATION ---
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
let rawRows = [];      

// --- DATA INITIALIZATION ---
async function loadData() {
    const timestamp = new Date().getTime();
    Papa.parse(`${STAFF_URL}&t=${timestamp}`, {
        download: true,
        complete: (results) => {
            for (let i = 1; i < results.data.length; i++) {
                let row = results.data[i];
                if (row[0] && row[0].trim() !== "") {
                    const nameKey = row[0].trim().toLowerCase();
                    staffMap[nameKey] = {
                        area: (row[1] && row[1].toLowerCase().includes('bar')) ? 'Bar' : 'Sala',
                        position: row[2] ? row[2].trim() : "Staff"
                    };
                }
            }
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
            const headerRow = rawRows[0]; 
            let dateCols = [];
            for (let j = 1; j < headerRow.length; j++) {
                let label = headerRow[j] ? headerRow[j].trim() : "";
                if (label !== "" && !label.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: label });
                    dates[label] = { Sala: [], Bar: [] };
                }
            }

            for (let i = 1; i < rawRows.length; i++) {
                let nameInSheet = rawRows[i][0] ? rawRows[i][0].trim() : "";
                if (!nameInSheet || nameInSheet.toLowerCase() === "name") continue;
                const info = staffMap[nameInSheet.toLowerCase()] || { area: 'Sala', position: 'Staff' };
                
                dateCols.forEach(col => {
                    let shift = rawRows[i][col.index] ? rawRows[i][col.index].trim() : "";
                    const hasNumbers = /\d/.test(shift);
                    const isOff = ["OFF", "FOLGA", "FÉRIAS", "BAIXA", "-", ""].includes(shift.toUpperCase());

                    if (hasNumbers && !isOff) {
                        let parts = shift.split(/[- ]+/);
                        dates[col.label][info.area].push({
                            name: nameInSheet,
                            position: info.position,
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

// --- MANAGE VIEW: SORTED BY AREA & FILTERED ---
function showStaffTable() {
    const selectedDate = document.getElementById('manageDateSelect').value;
    const wrapper = document.getElementById('scheduleTableWrapper');
    const headerRow = rawRows[0];
    const colIdx = headerRow.findIndex(cell => cell && cell.trim() === selectedDate);
    
    if (colIdx === -1) return;

    document.getElementById('staffTableContainer').style.display = 'block';
    document.getElementById('tableHeaderDate').innerText = selectedDate;

    let presentStaff = [];

    // 1. Collect and filter only staff present that day
    for (let i = 1; i < rawRows.length; i++) {
        let name = rawRows[i][0] ? rawRows[i][0].trim() : "";
        let shift = rawRows[i][colIdx] ? rawRows[i][colIdx].trim() : "";
        
        const isOff = ["OFF", "FOLGA", "FÉRIAS", "BAIXA", "-", ""].includes(shift.toUpperCase());
        const hasNumbers = /\d/.test(shift);

        if (name && name.toLowerCase() !== 'name' && !isOff && hasNumbers) {
            const info = staffMap[name.toLowerCase()] || { area: 'Sala', position: 'Staff' };
            presentStaff.push({
                name: name,
                shift: shift,
                area: info.area,
                position: info.position
            });
        }
    }

    // 2. Sort staff by area (Bar first, then Sala)
    presentStaff.sort((a, b) => a.area.localeCompare(b.area));

    // 3. Build HTML
    let html = `<div class="staff-grid-header"><span>NAME / POSITION</span><span>AREA</span><span>HOURS</span></div>`;

    presentStaff.forEach(s => {
        const areaClass = s.area.toLowerCase() === 'bar' ? 'tag-bar' : 'tag-sala';
        html += `
            <div class="staff-row">
                <div class="staff-name">
                    ${s.name}<br>
                    <span style="color:#888; font-size:10px; font-weight:normal;">${s.position.toUpperCase()}</span>
                </div>
                <div class="staff-area"><span class="area-tag ${areaClass}">${s.area.toUpperCase()}</span></div>
                <div class="staff-hours">${s.shift}</div>
            </div>`;
    });

    wrapper.innerHTML = presentStaff.length > 0 ? html : "<p style='text-align:center; padding:20px; color:#999;'>No staff scheduled for this day.</p>";
}

// NAVIGATION & UTILS
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
            <div class="briefing-info">
                <strong>${s.name}</strong> <small style="color:#666;">(${s.position})</small><br>
                <span>${s.time} - ${s.endTime}</span>
            </div>
            <input type="text" placeholder="Assign task..." onchange="updateTask('${date}','${area}',${i},this.value)">
        </div>`).join('');
    document.getElementById('modalResult').innerHTML = `
        <h2 style="color:#7a4f2c; margin-bottom:5px;">${date}</h2>
        <h4 style="color:#d9534f; border-bottom:1px solid #eee; margin-top:15px;">BAR</h4>${day.Bar.length ? render(day.Bar, 'Bar') : 'None'}
        <h4 style="color:#337ab7; border-bottom:1px solid #eee; margin-top:15px;">SALA</h4>${day.Sala.length ? render(day.Sala, 'Sala') : 'None'}`;
    document.getElementById('modal').style.display = 'flex';
}

function updateTask(date, area, index, val) { if(scheduleData[date]) scheduleData[date][area][index].task = val; }

function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    let txt = `*ZENITH BRIEFING - ${date}*\n\n*BAR:*\n` + 
              (day.Bar.map(s => `• ${s.name} (${s.position}) ${s.time}-${s.endTime}: ${s.task || ''}`).join('\n') || "None") + 
              `\n\n*SALA:*\n` + 
              (day.Sala.map(s => `• ${s.name} (${s.position}) ${s.time}-${s.endTime}: ${s.task || ''}`).join('\n') || "None");
    navigator.clipboard.writeText(txt).then(() => alert("Copied!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
function closeStaffTable() { document.getElementById('staffTableContainer').style.display = 'none'; }
window.onload = loadData;
