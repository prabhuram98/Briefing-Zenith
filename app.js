// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';





let staffData = [];
let scheduleData = {};
let employeeSchedules = {};

// --- NAVIGATION ---
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId + 'Page').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('pageTitle').innerText = pageId.toUpperCase();
    
    // Auto-close the staff table when switching pages for a clean UI
    if (pageId === 'briefing') closeStaffTable();
}

// --- DATA LOADING ---
async function loadStaff() {
    const timestamp = new Date().getTime();
    Papa.parse(`${STAFF_URL}&t=${timestamp}`, {
        download: true,
        complete: (results) => {
            // Cleans and maps the Staff Sheet (Column A: Name, Column B: Area)
            staffData = results.data
                .filter(r => r[0] && r[0].trim() !== "" && r[0].toLowerCase() !== "name")
                .map(r => ({ 
                    name: r[0].trim(), 
                    area: (r[1] && r[1].trim().toLowerCase() === 'bar') ? 'Bar' : 'Sala' 
                }));
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
            const rows = results.data;
            if (!rows || rows.length < 2) {
                console.error("Data structure error: Not enough rows found.");
                return;
            }

            const dates = {};
            const empSchedules = {};
            let dateCols = [];
            const headerRow = rows[0]; // Row 1: Dates

            // 1. Map Date Columns (Starting from Column B / Index 1)
            for (let j = 1; j < headerRow.length; j++) {
                let cellValue = headerRow[j] ? headerRow[j].trim() : "";
                if (cellValue !== "" && !cellValue.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: cellValue });
                    dates[cellValue] = { Sala: [], Bar: [] };
                }
            }

            // 2. Process Staff Rows (Starting from Row 2 / Index 1)
            for (let i = 1; i < rows.length; i++) {
                let nameInSheet = rows[i][0] ? rows[i][0].trim() : "";
                if (!nameInSheet || nameInSheet.toLowerCase() === 'name') continue;

                // Determine if Bar or Sala based on Staff sheet mapping
                const empMatch = staffData.find(s => s.name.toLowerCase() === nameInSheet.toLowerCase());
                const role = empMatch ? empMatch.area : 'Sala';
                empSchedules[nameInSheet] = [];

                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].trim() : "";
                    
                    // Filter out non-working statuses found in your CSV
                    const ignoreKeywords = ["OFF", "FOLGA", "FÉRIAS", "FÃ‰RIAS", "COMPENSAÇÃO", "COMPENSAÃ‡ÃƒO", "BAIXA", "-"];
                    const isWorking = shift !== "" && !ignoreKeywords.some(k => shift.toUpperCase().includes(k));

                    if (isWorking) {
                        // Normalize shift format (e.g., 07.30-16.02 to 07:30-16:02)
                        let times = shift.split('-');
                        let start = times[0]?.trim().replace('.', ':') || "--:--";
                        let end = times[1]?.trim().replace('.', ':') || "--:--";

                        dates[col.label][role].push({
                            name: nameInSheet,
                            time: start,
                            endTime: end,
                            task: ""
                        });
                        empSchedules[nameInSheet].push({ date: col.label, shift: shift });
                    }
                });
            }

            // 3. Sort lists by start time for better readability
            Object.keys(dates).forEach(d => {
                dates[d].Sala.sort((a, b) => a.time.localeCompare(b.time));
                dates[d].Bar.sort((a, b) => a.time.localeCompare(b.time));
            });

            scheduleData = dates;
            employeeSchedules = empSchedules;
            
            updateDateDropdowns(Object.keys(dates));
            renderStaffList();
        }
    });
}

function updateDateDropdowns(keys) {
    const options = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    document.getElementById('dateSelect').innerHTML = options;
    document.getElementById('manageDateSelect').innerHTML = options;
}

// --- MANAGE PAGE FUNCTIONS ---
function showStaffTable() {
    const selectedDate = document.getElementById('manageDateSelect').value;
    const dayData = scheduleData[selectedDate];
    const container = document.getElementById('staffTableContainer');
    const wrapper = document.getElementById('scheduleTableWrapper');
    const header = document.getElementById('tableHeaderDate');

    if (!dayData) return;

    container.style.display = 'block';
    header.innerText = `Staff for ${selectedDate}`;

    const createTableHtml = (list, areaName, color) => `
        <div style="margin-top:20px;">
            <h4 style="color:${color}; border-bottom: 2px solid ${color}; padding-bottom:5px; margin-bottom:10px;">${areaName}</h4>
            <table style="width:100%; border-collapse: collapse; font-size:14px;">
                <thead>
                    <tr style="background:#f8f9fa; text-align:left;">
                        <th style="padding:10px; border:1px solid #eee;">Name</th>
                        <th style="padding:10px; border:1px solid #eee;">Shift</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map(s => `
                        <tr>
                            <td style="padding:10px; border:1px solid #eee; font-weight:bold;">${s.name}</td>
                            <td style="padding:10px; border:1px solid #eee;">${s.time} - ${s.endTime}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    let finalHtml = "";
    if (dayData.Bar.length > 0) finalHtml += createTableHtml(dayData.Bar, "BAR", "#d9534f");
    if (dayData.Sala.length > 0) finalHtml += createTableHtml(dayData.Sala, "SALA", "#337ab7");
    
    wrapper.innerHTML = finalHtml || "<p style='padding:20px; color:#999;'>No working shifts recorded for this day.</p>";
    container.scrollIntoView({ behavior: 'smooth' });
}

function closeStaffTable() {
    document.getElementById('staffTableContainer').style.display = 'none';
}

// --- BRIEFING PAGE FUNCTIONS ---
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if(!day) return;
    
    document.getElementById('copyBtn').style.display = 'block';

    const renderBriefingList = (list, area) => list.map((s, i) => `
        <div style="margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:8px;">
            <div style="font-size:14px;"><strong>${s.name}</strong> (${s.time} - ${s.endTime})</div>
            <input type="text" placeholder="Assign task..." onchange="updateTask('${date}','${area}',${i},this.value)" 
                   style="width:90%; margin-top:5px; padding:8px; font-size:13px; border:1px solid #ccc; border-radius:4px;">
        </div>`).join('');

    let html = `<h2 style="color:#7a4f2c;">Briefing: ${date}</h2>`;
    html += `<h4 style="color:#d9534f;">BAR</h4>${day.Bar.length ? renderBriefingList(day.Bar, 'Bar') : 'No staff'}`;
    html += `<h4 style="color:#337ab7; margin-top:15px;">SALA</h4>${day.Sala.length ? renderBriefingList(day.Sala, 'Sala') : 'No staff'}`;

    document.getElementById('modalResult').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
}

function updateTask(date, area, index, val) { 
    scheduleData[date][area][index].task = val; 
}

function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    let txt = `*ZENITH BRIEFING - ${date}*\n\n*BAR:*\n`;
    txt += day.Bar.map(s => `• ${s.name} (${s.time}-${s.endTime}) ${s.task}`).join('\n') || "None";
    txt += `\n\n*SALA:*\n`;
    txt += day.Sala.map(s => `• ${s.name} (${s.time}-${s.endTime}) ${s.task}`).join('\n') || "None";
    
    navigator.clipboard.writeText(txt).then(() => alert("Copied to WhatsApp format!"));
}

function renderStaffList() {
    const html = Object.keys(employeeSchedules).sort().map(name => 
        `<div style="padding:8px 0; border-bottom:1px solid #f4f4f4; color:#555;">${name}</div>`
    ).join('');
    document.getElementById('staffList').innerHTML = html || "No data available.";
}

function closeModal() { 
    document.getElementById('modal').style.display = 'none'; 
}

// Start the app
window.onload = loadStaff;
