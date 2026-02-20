// --- CONFIGURATION ---
// App Data tab (Schedule)
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv'; 
// Staff List tab (to get Area: Bar/Sala)
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffData = [];
let scheduleData = {}; 
let rawRows = [];      

// --- NAVIGATION ---
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId + 'Page');
    if (target) target.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('pageTitle').innerText = pageId.toUpperCase();
}

// --- DATA LOADING ---
async function loadApp() {
    console.log("Loading Staff Areas...");
    const timestamp = new Date().getTime();
    
    // 1. Load Staff Areas first
    Papa.parse(`${STAFF_URL}&t=${timestamp}`, {
        download: true,
        complete: (results) => {
            staffData = results.data
                .filter(r => r[0] && r[0].trim() !== "")
                .map(r => ({
                    name: r[0].trim().toLowerCase(),
                    area: (r[1] && r[1].trim().toLowerCase().includes('bar')) ? 'Bar' : 'Sala'
                }));
            loadSchedule();
        }
    });
}

function loadSchedule() {
    console.log("Loading Schedule...");
    const timestamp = new Date().getTime();
    Papa.parse(`${SCHEDULE_URL}&t=${timestamp}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            rawRows = results.data;
            if (!rawRows || rawRows.length < 1) return;

            const dates = {};
            const headerRow = rawRows[0]; // Row 1 (A1 empty, B1, C1... are dates)
            let dateCols = [];

            // Identify Dates (Column B onwards)
            for (let j = 1; j < headerRow.length; j++) {
                let label = headerRow[j] ? headerRow[j].trim() : "";
                if (label !== "" && !label.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: label });
                    dates[label] = { Sala: [], Bar: [] };
                }
            }

            // Process shifts (Row 2 onwards)
            for (let i = 1; i < rawRows.length; i++) {
                let nameInSheet = rawRows[i][0] ? rawRows[i][0].trim() : "";
                if (!nameInSheet || nameInSheet.toLowerCase() === "name") continue;

                const emp = staffData.find(s => s.name === nameInSheet.toLowerCase());
                const role = emp ? emp.area : 'Sala';

                dateCols.forEach(col => {
                    let shift = rawRows[i][col.index] ? rawRows[i][col.index].trim() : "";
                    
                    const hasNumbers = /\d/.test(shift);
                    const isOff = ["OFF", "FOLGA", "FÉRIAS", "FÃ‰RIAS", "BAIXA", "-", ""].some(k => shift.toUpperCase().includes(k));

                    if (shift !== "" && hasNumbers && !isOff) {
                        let times = shift.split('-');
                        dates[col.label][role].push({
                            name: nameInSheet,
                            time: times[0]?.trim().replace('.', ':') || "--:--",
                            endTime: times[1]?.trim().replace('.', ':') || "--:--",
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

// --- MANAGE PAGE: MOBILE GRID ---
function showStaffTable() {
    const selectedDate = document.getElementById('manageDateSelect').value;
    const wrapper = document.getElementById('scheduleTableWrapper');
    const headerRow = rawRows[0];
    const dateIndex = headerRow.findIndex(cell => cell && cell.trim() === selectedDate);

    if (dateIndex === -1) return;

    document.getElementById('staffTableContainer').style.display = 'block';
    document.getElementById('tableHeaderDate').innerText = selectedDate;

    let html = `<div class="staff-grid-header"><span>NAME</span><span>AREA</span><span>HOURS</span></div>`;
    let count = 0;

    for (let i = 1; i < rawRows.length; i++) {
        let name = rawRows[i][0] ? rawRows[i][0].trim() : ""; 
        let shift = rawRows[i][dateIndex] ? rawRows[i][dateIndex].trim() : "";
        
        const hasNumbers = /\d/.test(shift);
        const isOff = ["OFF", "FOLGA", "FÉRIAS", "FÃ‰RIAS", "BAIXA", "-", ""].some(k => shift.toUpperCase().includes(k));

        if (name && hasNumbers && !isOff) {
            count++;
            const emp = staffData.find(s => s.name === name.toLowerCase());
            const area = emp ? emp.area.toUpperCase() : 'SALA';
            const areaClass = area === 'BAR' ? 'tag-bar' : 'tag-sala';

            html += `
                <div class="staff-row">
                    <div class="staff-name">${name}</div>
                    <div class="staff-area"><span class="area-tag ${areaClass}">${area}</span></div>
                    <div class="staff-hours">${shift.replace('.', ':')}</div>
                </div>
            `;
        }
    }
    wrapper.innerHTML = count > 0 ? html : "<p style='text-align:center; padding:20px;'>No staff working.</p>";
}

function closeStaffTable() { document.getElementById('staffTableContainer').style.display = 'none'; }

// --- BRIEFING LOGIC ---
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
        <h2 style="color:var(--accent);">${date}</h2>
        <h4 style="color:var(--bar-color);">BAR</h4>${day.Bar.length ? render(day.Bar, 'Bar') : 'None'}
        <h4 style="color:var(--sala-color); margin-top:15px;">SALA</h4>${day.Sala.length ? render(day.Sala, 'Sala') : 'None'}
    `;
    document.getElementById('modal').style.display = 'flex';
}

function updateTask(date, area, index, val) { scheduleData[date][area][index].task = val; }

function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    let txt = `*ZENITH BRIEFING - ${date}*\n\n*BAR:*\n`;
    txt += day.Bar.map(s => `• ${s.name} (${s.time}-${s.endTime}) ${s.task || ''}`).join('\n') || "None";
    txt += `\n\n*SALA:*\n`;
    txt += day.Sala.map(s => `• ${s.name} (${s.time}-${s.endTime}) ${s.task || ''}`).join('\n') || "None";
    navigator.clipboard.writeText(txt).then(() => alert("Copied!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
window.onload = loadApp;
