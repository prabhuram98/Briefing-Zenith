// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=0&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=609693221&single=true&output=csv';




let staffData = [];
let scheduleData = {};

// 1. Load Staff Roles
async function loadStaff() {
    const freshStaffUrl = STAFF_URL + (STAFF_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
    Papa.parse(freshStaffUrl, {
        download: true,
        complete: (results) => {
            staffData = results.data
                .filter(r => r[0] && !['name', 'nome'].includes(r[0].toLowerCase().trim()))
                .map(r => ({ name: r[0].trim(), area: r[1] ? r[1].trim() : 'Sala' }));
            loadSchedule(); 
        }
    });
}

// 2. Load Schedule - DATES ARE PRIMARY
function loadSchedule() {
    const freshScheduleUrl = SCHEDULE_URL + (SCHEDULE_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();

    Papa.parse(freshScheduleUrl, {
        download: true,
        complete: (results) => {
            const rows = results.data;
            if (!rows || rows.length === 0) return;

            const dates = {};
            const row1 = rows[0]; // The very first row
            const dateCols = [];

            // Grab everything from Column D (Index 3) onwards
            for (let i = 3; i < row1.length; i++) {
                let dateVal = row1[i] ? row1[i].trim() : "";
                if (dateVal !== "") {
                    dateCols.push({ idx: i, label: dateVal });
                    dates[dateVal] = { Sala: [], Bar: [] };
                }
            }

            // Fill the dates with staff found in Column C (Index 2)
            for (let i = 1; i < rows.length; i++) {
                let nameInSheet = rows[i][2] ? rows[i][2].trim() : "";
                if (!nameInSheet || nameInSheet.toLowerCase() === "name") continue;

                // Match with Manage list to get the Area (Sala/Bar)
                const match = staffData.find(s => s.name.toLowerCase() === nameInSheet.toLowerCase());
                const role = match ? match.area : 'Sala';

                dateCols.forEach(col => {
                    let shift = rows[i][col.idx] ? rows[i][col.idx].trim() : "";
                    // If there is a shift and it's not "OFF"
                    if (shift !== "" && !["OFF", "FOLGA", "F", "-"].includes(shift.toUpperCase())) {
                        dates[col.label][role].push({
                            name: match ? match.name : nameInSheet,
                            in: shift.split('-')[0].trim().replace('.', ':'),
                            task: ""
                        });
                    }
                });
            }

            scheduleData = dates;
            updateDateDropdown(Object.keys(dates));
        }
    });
}

function updateDateDropdown(dateKeys) {
    const sel = document.getElementById('dateSelect');
    if (dateKeys.length === 0) {
        sel.innerHTML = '<option>No dates found in Row 1</option>';
    } else {
        sel.innerHTML = dateKeys.map(d => `<option value="${d}">${d}</option>`).join('');
    }
}

// 3. Briefing Generation (Your exact template)
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if (!day) return;

    const renderRows = (list, area) => list.map((s, i) => `
        <div style="display:flex; gap:10px; margin-bottom:8px; align-items:center;">
            <span style="min-width:120px;"><strong>${s.in}</strong> ${s.name}</span>
            <input type="text" placeholder="Tarefa..." 
                onchange="updateTask('${date}','${area}',${i},this.value)" 
                style="flex-grow:1; padding:5px; border:1px solid #ccc; border-radius:4px;">
        </div>`).join('');

    let html = `<h3>Briefing: ${date}</h3>`;
    html += `<h4>BAR</h4>` + (day.Bar.length ? renderRows(day.Bar, 'Bar') : "Sem staff");
    html += `<h4 style="margin-top:15px;">SALA</h4>` + (day.Sala.length ? renderRows(day.Sala, 'Sala') : "Sem staff");

    document.getElementById('briefingResult').innerHTML = html;
    document.getElementById('modal').style.display = 'flex';
}

function updateTask(date, area, index, value) {
    scheduleData[date][area][index].task = value;
}

function copyText() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    
    let text = `*ZENITH BRIEFING - ${date.toUpperCase()}*\n\n`;
    text += `*BAR:*\n`;
    text += day.Bar.length ? day.Bar.map(s => `${s.in} ${s.name} ${s.task}`).join('\n') : "Sem staff";
    text += `\n\n*SALA:*\n`;
    text += day.Sala.length ? day.Sala.map(s => `${s.in} ${s.name} ${s.task}`).join('\n') : "Sem staff";

    navigator.clipboard.writeText(text).then(() => alert("Copiado!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
window.onload = loadStaff;
