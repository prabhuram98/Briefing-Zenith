// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=0&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=609693221&single=true&output=csv';




let staffData = [];
let scheduleData = {};

async function loadStaff() {
    const freshStaffUrl = STAFF_URL + (STAFF_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
    Papa.parse(freshStaffUrl, {
        download: true,
        complete: (results) => {
            staffData = results.data
                .filter(r => r[0] && !['name', 'nome'].includes(r[0].toLowerCase().trim()))
                .map(r => ({ name: r[0].trim(), area: r[1] ? r[1].trim() : 'Sala' }));
            renderStaffList();
            loadSchedule(); 
        },
        error: (err) => console.error("Error loading Staff CSV:", err)
    });
}

function loadSchedule() {
    const freshScheduleUrl = SCHEDULE_URL + (SCHEDULE_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();

    Papa.parse(freshScheduleUrl, {
        download: true,
        complete: (results) => {
            const dates = {};
            const rows = results.data;
            
            if (!rows || rows.length === 0) {
                console.error("The spreadsheet appears to be empty.");
                return;
            }

            // 1. DATE DISCOVERY: Scan Row 1 (Index 0)
            const row1 = rows[0];
            const dateCols = [];
            
            // Start from Index 3 (Column D) as per your sheet layout
            for (let i = 3; i < row1.length; i++) {
                const cellValue = row1[i] ? row1[i].trim() : "";
                if (cellValue !== "") {
                    console.log("Found Date:", cellValue);
                    dateCols.push({ idx: i, date: cellValue });
                    dates[cellValue] = { Sala: [], Bar: [] };
                }
            }

            if (dateCols.length === 0) {
                console.warn("No dates found in Row 1 starting from Column D.");
            }

            // 2. STAFF DISCOVERY: Scan Column C (Index 2)
            for (let i = 1; i < rows.length; i++) {
                const nameInSheet = rows[i][2] ? rows[i][2].trim().toLowerCase() : "";
                if (nameInSheet === "") continue;

                const match = staffData.find(s => s.name.toLowerCase() === nameInSheet);
                const role = match ? match.area : 'Sala';
                const displayName = match ? match.name : rows[i][2].trim();

                dateCols.forEach(c => {
                    let shift = rows[i][c.idx] ? rows[i][c.idx].trim() : "";
                    if (shift !== "" && !["OFF", "FOLGA", "F", "-"].includes(shift.toUpperCase())) {
                        dates[c.date][role].push({
                            name: displayName,
                            in: shift.split('-')[0].trim().replace('.', ':'),
                            task: ""
                        });
                    }
                });
            }

            scheduleData = dates;
            updateDateDropdown(Object.keys(dates));
        },
        error: (err) => console.error("Error loading Schedule CSV:", err)
    });
}

function updateDateDropdown(dateKeys) {
    const sel = document.getElementById('dateSelect');
    if (dateKeys.length > 0) {
        sel.innerHTML = dateKeys.map(d => `<option value="${d}">${d}</option>`).join('');
    } else {
        sel.innerHTML = '<option value="">No Dates Found</option>';
    }
}

// ... rest of your UI functions (generateBriefing, copyText, etc. stay the same)

function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    if (!date || !scheduleData[date]) return;
    const day = scheduleData[date];

    const renderRows = (list, area) => list.map((s, i) => `
        <div style="display:flex; gap:10px; margin-bottom:8px; align-items:center;">
            <span style="min-width:120px;"><strong>${s.in}</strong> ${s.name}</span>
            <input type="text" placeholder="Tarefa..." onchange="updateTask('${date}','${area}',${i},this.value)" style="flex-grow:1; padding:5px;">
        </div>`).join('');

    let html = `<h3>${date}</h3>`;
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
    let text = `*ZENITH BRIEFING - ${date.toUpperCase()}*\n\n*BAR:*\n`;
    text += day.Bar.length ? day.Bar.map(s => `${s.in} ${s.name} ${s.task}`).join('\n') : "Sem staff";
    text += `\n\n*SALA:*\n`;
    text += day.Sala.length ? day.Sala.map(s => `${s.in} ${s.name} ${s.task}`).join('\n') : "Sem staff";
    navigator.clipboard.writeText(text).then(() => alert("Copiado!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
window.onload = loadStaff;
