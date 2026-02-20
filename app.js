// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffData = [];
let scheduleData = {}; // For Briefing (Filtered)
let rawRows = [];      // For Manage Page (Exact match of Sheet)

// --- NAVIGATION ---
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId + 'Page').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('pageTitle').innerText = pageId.toUpperCase();
    if (pageId === 'briefing') closeStaffTable();
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
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            rawRows = results.data;
            if (!rawRows || rawRows.length < 2) return;

            const dates = {};
            const headerRow = rawRows[0];
            let dateCols = [];

            // Identify Date Columns (B onwards)
            for (let j = 1; j < headerRow.length; j++) {
                let label = headerRow[j] ? headerRow[j].trim() : "";
                if (label !== "" && !label.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: label });
                    dates[label] = { Sala: [], Bar: [] };
                }
            }

            // Process for Briefing (Working only)
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
            updateDateDropdowns(Object.keys(dates));
        }
    });
}

function updateDateDropdowns(keys) {
    const options = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    document.getElementById('dateSelect').innerHTML = options;
    document.getElementById('manageDateSelect').innerHTML = options;
}

// --- MANAGE PAGE: EXACT SHEET VIEW ---
function showStaffTable() {
    const selectedDate = document.getElementById('manageDateSelect').value;
    const container = document.getElementById('staffTableContainer');
    const wrapper = document.getElementById('scheduleTableWrapper');
    const header = document.getElementById('tableHeaderDate');

    const headerRow = rawRows[0];
    const dateIndex = headerRow.indexOf(selectedDate);

    if (dateIndex === -1) return;

    container.style.display = 'block';
    header.innerText = selectedDate;

    let html = `
        <table class="schedule-table">
            <thead>
                <tr>
                    <th>Staff Name</th>
                    <th>Shift / Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (let i = 1; i < rawRows.length; i++) {
        let name = rawRows[i][0] ? rawRows[i][0].trim() : "";
        let status = rawRows[i][dateIndex] ? rawRows[i][dateIndex].trim() : "-";
        if (!name || name.toLowerCase() === 'name') continue;

        const isOff = ["OFF", "FOLGA", "FÉRIAS", "FÃ‰RIAS"].some(k => status.toUpperCase().includes(k));
        
        html += `
            <tr class="${isOff ? 'row-off' : 'row-working'}">
                <td><strong>${name}</strong></td>
                <td>${status}</td>
            </tr>
        `;
    }

    html += `</tbody></table>`;
    wrapper.innerHTML = html;
    container.scrollIntoView({ behavior: 'smooth' });
}

function closeStaffTable() {
    document.getElementById('staffTableContainer').style.display = 'none';
}

// --- BRIEFING LOGIC ---
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if(!day) return;

    const render = (list, area) => list.map((s, i) => `
        <div class="briefing-item">
            <div class="briefing-info"><strong>${s.name}</strong> (${s.time}-${s.endTime})</div>
            <input type="text" placeholder="Assign Task..." onchange="updateTask('${date}','${area}',${i},this.value)">
        </div>`).join('');

    let html = `<h2>Briefing: ${date
