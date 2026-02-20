// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffData = [];
let scheduleData = {}; 
let rawRows = [];      

// --- NAVIGATION ---
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) targetPage.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.getElementById('pageTitle').innerText = pageId.toUpperCase();
    if (pageId === 'briefing') closeStaffTable();
}

// --- DATA LOADING ---
async function loadStaff() {
    console.log("Fetching Staff List...");
    const timestamp = new Date().getTime();
    Papa.parse(`${STAFF_URL}&t=${timestamp}`, {
        download: true,
        complete: (results) => {
            staffData = results.data
                .filter(r => r[0] && r[0].trim() !== "" && r[0].toLowerCase() !== "name")
                .map(r => ({ 
                    name: r[0].trim(), 
                    area: (r[1] && r[1].trim().toLowerCase().includes('bar')) ? 'Bar' : 'Sala' 
                }));
            console.log("Staff Loaded:", staffData.length, "people");
            loadSchedule();
        },
        error: (err) => console.error("Error loading staff sheet:", err)
    });
}

function loadSchedule() {
    console.log("Fetching Schedule Data...");
    const timestamp = new Date().getTime();
    Papa.parse(`${SCHEDULE_URL}&t=${timestamp}`, {
        download: true,
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            rawRows = results.data;
            if (!rawRows || rawRows.length < 1) {
                console.error("Schedule CSV is empty.");
                return;
            }

            const dates = {};
            // Look for the header in the first 2 rows (in case row 1 is empty)
            let headerRow = rawRows[0].some(cell => cell.trim() !== "") ? rawRows[0] : rawRows[1];
            let dateCols = [];

            // Identify Date Columns
            for (let j = 1; j < headerRow.length; j++) {
                let label = headerRow[j] ? headerRow[j].trim() : "";
                if (label !== "" && !label.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: label });
                    dates[label] = { Sala: [], Bar: [] };
                }
            }

            // Process shifts for the Briefing
            for (let i = 1; i < rawRows.length; i++) {
                let name = rawRows[i][0] ? rawRows[i][0].trim() : "";
                if (!name || name.toLowerCase() === 'name') continue;

                const emp = staffData.find(s => s.name.toLowerCase() === name.toLowerCase());
                const role = emp ? emp.area : 'Sala';

                dateCols.forEach(col => {
                    let shift = rawRows[i][col.index] ? rawRows[i][col.index].trim() : "";
                    const ignore = ["OFF", "FOLGA", "FÉRIAS", "FÃ‰RIAS", "COMPENSAÇÃO", "BAIXA", "-"];
                    const isWorking = shift !== "" && !ignore.some(k => shift.toUpperCase().includes(k));

                    if (isWorking) {
                        let times = shift.split('-');
                        dates[col.label][role].push({
                            name: name,
                            time: times[0]?.trim().replace('.', ':') || "--:--",
                            endTime: times[1]?.trim().replace('.', ':') || "--:--",
                            task: ""
                        });
                    }
                });
            }

            scheduleData = dates;
            const dateKeys = Object.keys(dates);
            if (dateKeys.length > 0) {
                updateDateDropdowns(dateKeys);
                console.log("Successfully loaded dates:", dateKeys);
            } else {
                console.warn("No dates found in CSV. Check APP_DATA Row 1.");
            }
        }
    });
}

function updateDateDropdowns(keys) {
    const briefingSelect = document.getElementById('dateSelect');
    const manageSelect = document.getElementById('manageDateSelect');
    
    const options = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    
    if(briefingSelect) briefingSelect.innerHTML = options;
    if(manageSelect) manageSelect.innerHTML = options;
}

// --- MANAGE PAGE: MOBILE GRID VIEW (Active Staff Only) ---
function showStaffTable() {
    const select = document.getElementById('manageDateSelect');
    if (!select) return;
    
    const selectedDate = select.value;
    const container = document.getElementById('staffTableContainer');
    const wrapper = document.getElementById('scheduleTableWrapper');
    const header = document.getElementById('tableHeaderDate');

    // Find correct column for selected date
    let headerRow = rawRows[0].some(cell => cell.includes('/')) ? rawRows[0] : rawRows[1];
    const dateIndex = headerRow.findIndex(cell => cell.trim() === selectedDate);

    if (dateIndex === -1) {
        alert("Could not find data for this date.");
        return;
    }

    container.style.display = 'block';
    header.innerText = selectedDate;

    let html = `
        <div class="staff-grid-header">
            <span>NAME</span>
            <span>AREA</span>
            <span>HOURS</span>
        </div>
    `;

    let activeCount = 0;
    for (let i = 1; i < rawRows.length; i++) {
        let name = rawRows[i][0] ? rawRows[i][0].trim() : "";
        let shift = rawRows[i][dateIndex] ? rawRows[i][dateIndex].trim() : "";
        
        const ignore = ["OFF", "FOLGA", "FÉRIAS", "FÃ‰RIAS", "BAIXA", "-", ""];
        const isOff = ignore.some(k => shift.toUpperCase().includes(k)) || shift === "";

        if (name && name.toLowerCase() !== 'name' && !isOff) {
            activeCount++;
            const emp = staffData.find(s => s.name.toLowerCase() === name.toLowerCase());
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

    wrapper.innerHTML = activeCount > 0 ? html : "<p style='padding:20px; text-align:center; color:#999;'>No active staff found for this day.</p>";
    container.scrollIntoView({ behavior: 'smooth' });
}

function closeStaffTable() {
    const container = document.getElementById('staffTableContainer');
    if (container) container.style.display = 'none';
}

// --- BRIEFING LOGIC ---
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if(!day) return;

    const renderItems = (list, area) => list.map((s, i) => `
        <div class="briefing-item">
            <div class="briefing-info"><strong>${s.name}</strong> (${s.time}-${s.endTime})</div>
            <input type="text" placeholder="Task..." onchange="updateTask('${date}','${area}',${i},this.value)">
        </div>`).join('');

    let html = `<h2>Briefing: ${date}</h2>`;
    html += `<h4 class="label-bar">BAR</h4>${day.Bar.length ? renderItems(day.Bar, 'Bar') : '<p>Empty</p>'}`;
    html += `<h4 class="label-sala">SALA</h4>${day.Sala.length ? renderItems(day.Sala, 'Sala') : '<p>Empty</p>'}`;

    document.getElementById('modalResult').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
}

function updateTask(date, area, index, val) { 
    if(scheduleData[date] && scheduleData[date][area][index]) {
        scheduleData[date][area][index].task = val; 
    }
}

function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    let txt = `*ZENITH BRIEFING - ${date}*\n\n*BAR:*\n`;
    txt += day.Bar.map(s => `• ${s.name} (${s.time}-${s.endTime}) ${s.task || ''}`).join('\n') || "None";
    txt += `\n\n*SALA:*\n`;
    txt += day.Sala.map(s => `• ${s.name} (${s.time}-${s.endTime}) ${s.task || ''}`).join('\n') || "None";
    
    navigator.clipboard.writeText(txt).then(() => alert("Copied to clipboard!"));
}

function closeModal() { 
    document.getElementById('modal').style.display = 'none'; 
}

// Run on Start
window.onload = loadStaff;
