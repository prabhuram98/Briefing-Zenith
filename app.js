// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=0&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=609693221&single=true&output=csv';

let staffData = [];
let scheduleData = {};

async function loadStaff() {
    const timestamp = new Date().getTime();
    const freshStaffUrl = `${STAFF_URL}${STAFF_URL.includes('?') ? '&' : '?'}cache=${timestamp}`;
    Papa.parse(freshStaffUrl, {
        download: true,
        complete: (results) => {
            staffData = results.data
                .filter(r => r[0] && !['name', 'nome', ''].includes(r[0].toLowerCase().trim()))
                .map(r => ({ name: r[0].trim(), area: r[1] ? r[1].trim() : 'Sala' }));
            loadSchedule(); 
        }
    });
}

function loadSchedule() {
    const timestamp = new Date().getTime();
    const freshScheduleUrl = `${SCHEDULE_URL}${SCHEDULE_URL.includes('?') ? '&' : '?'}cache=${timestamp}`;

    Papa.parse(freshScheduleUrl, {
        download: true,
        complete: (results) => {
            const rows = results.data;
            if (!rows || rows.length === 0) return;

            const dates = {};
            let dateCols = [];
            
            // 1. FIND THE DATE ROW (Looking for 01/jan, 02/fev, etc.)
            const ptMonths = /jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez/i;
            let headerRowIndex = -1;

            for (let i = 0; i < Math.min(rows.length, 5); i++) {
                const row = rows[i];
                // Check if any cell in columns D onwards looks like a date
                for (let j = 3; j < row.length; j++) {
                    if (ptMonths.test(row[j] || "")) {
                        headerRowIndex = i;
                        break;
                    }
                }
                if (headerRowIndex !== -1) break;
            }

            // If we didn't find the date row, the app will fail
            if (headerRowIndex === -1) {
                console.error("No dates found in Portuguese format.");
                return;
            }

            const headerRow = rows[headerRowIndex];
            for (let j = 3; j < headerRow.length; j++) {
                let cellText = headerRow[j] ? headerRow[j].trim() : "";
                if (cellText !== "") {
                    dateCols.push({ index: j, label: cellText });
                    // Initialize the container for this date
                    dates[cellText] = { Sala: [], Bar: [] };
                }
            }

            // 2. LOAD STAFF DATA
            for (let i = headerRowIndex + 1; i < rows.length; i++) {
                let nameInSheet = rows[i][2] ? rows[i][2].trim() : ""; // Column C
                if (!nameInSheet || nameInSheet.toLowerCase() === 'name') continue;

                const match = staffData.find(s => s.name.toLowerCase() === nameInSheet.toLowerCase());
                const role = match ? match.area : 'Sala';

                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].trim() : "";
                    
                    // The Fix: Only push if the date was properly initialized in the header
                    if (shift !== "" && !["OFF", "FOLGA", "F", "-", "X"].includes(shift.toUpperCase())) {
                        if (dates[col.label]) {
                            dates[col.label][role].push({
                                name: match ? match.name : nameInSheet,
                                in: shift.split('-')[0].trim().replace('.', ':'),
                                task: ""
                            });
                        }
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
        sel.innerHTML = '<option>Datas não encontradas</option>';
    } else {
        sel.innerHTML = dateKeys.map(d => `<option value="${d}">${d}</option>`).join('');
    }
}

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
    
    let text = `*ZENITH BRIEFING - ${date.toUpperCase()}*\n\n`;
    text += `*BAR:*\n`;
    text += day.Bar.length ? day.Bar.map(s => `${s.in} ${s.name} ${s.task}`).join('\n') : "Sem staff";
    text += `\n\n*SALA:*\n`;
    text += day.Sala.length ? day.Sala.map(s => `${s.in} ${s.name} ${s.task}`).join('\n') : "Sem staff";

    navigator.clipboard.writeText(text).then(() => alert("Copiado!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
window.onload = loadStaff;
