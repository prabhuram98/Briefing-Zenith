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
}

// --- DATA LOADING ---
async function loadStaff() {
    const timestamp = new Date().getTime();
    Papa.parse(`${STAFF_URL}&t=${timestamp}`, {
        download: true,
        complete: (results) => {
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
        complete: (results) => {
            const rows = results.data;
            if (!rows || rows.length < 1) return;

            const dates = {};
            const empSchedules = {};
            let dateCols = [];
            const headerRow = rows[0]; 

            for (let j = 3; j < headerRow.length; j++) {
                let cellValue = headerRow[j] ? headerRow[j].trim() : "";
                if (cellValue !== "") {
                    dateCols.push({ index: j, label: cellValue });
                    dates[cellValue] = { Sala: [], Bar: [] };
                }
            }

            for (let i = 1; i < rows.length; i++) {
                let nameInSheet = rows[i][2] ? rows[i][2].trim() : "";
                if (!nameInSheet) continue;

                const emp = staffData.find(s => s.name.toLowerCase() === nameInSheet.toLowerCase());
                const role = emp ? emp.area : 'Sala';
                empSchedules[nameInSheet] = [];

                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].trim() : "";
                    if (shift !== "" && !["OFF", "FOLGA", "F", "-"].includes(shift.toUpperCase())) {
                        let times = shift.split('-');
                        let start = times[0]?.trim().replace('.', ':') || "--:--";
                        let end = times[1]?.trim().replace('.', ':') || "--:--";

                        dates[col.label][role].push({
                            name: emp ? emp.name : nameInSheet,
                            time: start,
                            endTime: end,
                            task: ""
                        });
                        empSchedules[nameInSheet].push({ date: col.label, shift: shift });
                    }
                });
            }

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

// --- CORE FUNCTIONS ---
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    document.getElementById('copyBtn').style.display = 'block';

    const render = (list, area) => list.map((s, i) => `
        <div style="margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:8px;">
            <div style="font-size:14px;"><strong>${s.name}</strong> (${s.time} - ${s.endTime})</div>
            <input type="text" placeholder="Assign Task..." onchange="updateTask('${date}','${area}',${i},this.value)" 
                   style="width:90%; margin-top:5px; padding:6px; font-size:13px;">
        </div>`).join('');

    let html = `<h2>Briefing: ${date}</h2>`;
    html += `<h4 style="color:#d9534f;">BAR</h4>${day.Bar.length ? render(day.Bar, 'Bar') : 'No Staff'}`;
    html += `<h4 style="color:#337ab7; margin-top:15px;">SALA</h4>${day.Sala.length ? render(day.Sala, 'Sala') : 'No Staff'}`;

    document.getElementById('modalResult').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
}

function viewToday() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date];
    document.getElementById('copyBtn').style.display = 'none';

    const renderTable = (list, color) => `
        <table style="width:100%; text-align:left; font-size:14px; margin-bottom:15px;">
            <tr style="color:#888;"><th>Name</th><th>In</th><th>Out</th></tr>
            ${list.map(s => `<tr style="border-bottom:1px solid #eee;"><td style="padding:8px 0;">${s.name}</td><td>${s.time}</td><td>${s.endTime}</td></tr>`).join('')}
        </table>`;

    let html = `<h2>Schedule: ${date}</h2>`;
    html += `<h4 style="color:#d9534f; border-bottom:1px solid #d9534f;">BAR</h4>` + (day.Bar.length ? renderTable(day.Bar, '#d9534f') : 'None');
    html += `<h4 style="color:#337ab7; border-bottom:1px solid #337ab7; margin-top:20px;">SALA</h4>` + (day.Sala.length ? renderTable(day.Sala, '#337ab7') : 'None');

    document.getElementById('modalResult').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
}

function updateTask(date, area, index, val) { scheduleData[date][area][index].task = val; }

function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    let txt = `*ZENITH BRIEFING - ${date}*\n\n*BAR:*\n`;
    txt += day.Bar.map(s => `${s.name} (${s.time}-${s.endTime}) ${s.task}`).join('\n') || "None";
    txt += `\n\n*SALA:*\n`;
    txt += day.Sala.map(s => `${s.name} (${s.time}-${s.endTime}) ${s.task}`).join('\n') || "None";
    navigator.clipboard.writeText(txt).then(() => alert("Copied!"));
}

function renderStaffList() {
    const html = Object.keys(employeeSchedules).map(name => `<div><strong>${name}</strong></div>`).join('');
    document.getElementById('staffList').innerHTML = html;
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
window.onload = loadStaff;
