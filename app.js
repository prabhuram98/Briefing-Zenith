// --- CONFIGURATION ---
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
let rawRows = [];      

const POSITION_ORDER = {
    "MANAGER": 1,
    "BAR MANAGER": 2,
    "HEAD SELLER": 3,
    "BAR STAFF": 4,
    "SALA STAFF": 5,
    "STAFF": 6
};

// --- DATA INITIALIZATION ---
async function loadData() {
    const timestamp = new Date().getTime();
    Papa.parse(`${STAFF_URL}&t=${timestamp}`, {
        download: true,
        complete: (results) => {
            for (let i = 1; i < results.data.length; i++) {
                let row = results.data[i];
                if (row[0] && row[0].trim() !== "") {
                    const fullNameKey = row[0].trim().toLowerCase();
                    const rawPos = row[2] ? row[2].trim().toUpperCase() : "STAFF";
                    
                    staffMap[fullNameKey] = {
                        alias: row[3] ? row[3].trim() : row[0].trim(), // Fetch Column D
                        area: (row[1] && row[1].toLowerCase().includes('bar')) ? 'Bar' : 'Sala',
                        position: rawPos,
                        priority: POSITION_ORDER[rawPos] || 99
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
                
                const info = staffMap[nameInSheet.toLowerCase()] || { alias: nameInSheet, area: 'Sala', position: 'STAFF', priority: 99 };
                
                dateCols.forEach(col => {
                    let shift = rawRows[i][col.index] ? rawRows[i][col.index].trim() : "";
                    const hasNumbers = /\d/.test(shift);
                    const isOff = ["OFF", "FOLGA", "FÉRIAS", "BAIXA", "-", ""].includes(shift.toUpperCase());

                    if (hasNumbers && !isOff) {
                        let parts = shift.split(/[- ]+/);
                        dates[col.label][info.area].push({
                            displayName: info.alias, 
                            position: info.position,
                            priority: info.priority,
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

// --- MANAGE VIEW ---
function showStaffTable() {
    const selectedDate = document.getElementById('manageDateSelect').value;
    const wrapper = document.getElementById('scheduleTableWrapper');
    const headerRow = rawRows[0];
    const colIdx = headerRow.findIndex(cell => cell && cell.trim() === selectedDate);
    
    if (colIdx === -1) return;

    document.getElementById('staffTableContainer').style.display = 'block';
    document.getElementById('tableHeaderDate').innerText = selectedDate;

    let presentStaff = [];

    for (let i = 1; i < rawRows.length; i++) {
        let fullName = rawRows[i][0] ? rawRows[i][0].trim() : "";
        let shift = rawRows[i][colIdx] ? rawRows[i][colIdx].trim() : "";
        
        const isOff = ["OFF", "FOLGA", "FÉRIAS", "BAIXA", "-", ""].includes(shift.toUpperCase());
        const hasNumbers = /\d/.test(shift);

        if (fullName && fullName.toLowerCase() !== 'name' && !isOff && hasNumbers) {
            const info = staffMap[fullName.toLowerCase()] || { alias: fullName, area: 'Sala', position: 'STAFF', priority: 99 };
            presentStaff.push({
                alias: info.alias,
                shift: shift,
                area: info.area,
                position: info.position,
                priority: info.priority
            });
        }
    }

    presentStaff.sort((a, b) => a.priority - b.priority);

    let html = `<div class="staff-grid-header"><span>NAME / POSITION</span><span>AREA</span><span>HOURS</span></div>`;

    presentStaff.forEach(s => {
        const areaClass = s.area.toLowerCase() === 'bar' ? 'tag-bar' : 'tag-sala';
        html += `
            <div class="staff-row">
                <div class="staff-name">
                    ${s.alias}<br>
                    <span style="color:#ce8d5a; font-size:10px; font-weight:bold;">${s.position}</span>
                </div>
                <div class="staff-area"><span class="area-tag ${areaClass}">${s.area.toUpperCase()}</span></div>
                <div class="staff-hours">${s.shift}</div>
            </div>`;
    });

    wrapper.innerHTML = presentStaff.length > 0 ? html : "<p style='text-align:center; padding:20px;'>No staff scheduled.</p>";
}

// --- BRIEFING & COPY ---
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if(!day) return;
    const render = (list, area) => list.sort((a,b) => a.priority - b.priority).map((s, i) => `
        <div class="briefing-item">
            <div class="briefing-info">
                <strong>${s.displayName}</strong> <small style="color:#666;">(${s.position})</small><br>
                <span>${s.time} - ${s.endTime}</span>
            </div>
            <input type="text" placeholder="Task..." onchange="updateTask('${date}','${area}',${i},this.value)">
        </div>`).join('');

    document.getElementById('modalResult').innerHTML = `
        <h2 style="color:#7a4f2c;">${date}</h2>
        <h4 style="color:#d9534f; border-bottom:1px solid #eee;">BAR</h4>${day.Bar.length ? render(day.Bar, 'Bar') : 'None'}
        <h4 style="color:#337ab7; border-bottom:1px solid #eee; margin-top:15px;">SALA</h4>${day.Sala.length ? render(day.Sala, 'Sala') : 'None'}`;
    document.getElementById('modal').style.display = 'flex';
}

function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    const sortFn = (a,b) => a.priority - b.priority;
    let txt = `*ZENITH BRIEFING - ${date}*\n\n*BAR:*\n` + 
              (day.Bar.sort(sortFn).map(s => `• ${s.displayName} (${s.position}) ${s.time}-${s.endTime}: ${s.task || ''}`).join('\n') || "None") + 
              `\n\n*SALA:*\n` + 
              (day.Sala.sort(sortFn).map(s => `• ${s.displayName} (${s.position}) ${s.time}-${s.endTime}: ${s.task || ''}`).join('\n') || "None");
    navigator.clipboard.writeText(txt).then(() => alert("Briefing Copied!"));
}

// NAVIGATION
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId + 'Page').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('pageTitle').innerText = pageId.toUpperCase();
}
function updateTask(date, area, index, val) { if(scheduleData[date]) scheduleData[date][area][index].task = val; }
function updateDropdowns(keys) {
    const options = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    document.getElementById('dateSelect').innerHTML = options;
    document.getElementById('manageDateSelect').innerHTML = options;
}
function closeModal() { document.getElementById('modal').style.display = 'none'; }
function closeStaffTable() { document.getElementById('staffTableContainer').style.display = 'none'; }
window.onload = loadData;
