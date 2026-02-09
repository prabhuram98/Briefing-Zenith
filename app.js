// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=0&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=609693221&single=true&output=csv';

let staffData = [];
let scheduleData = {};

async function loadStaff() {
    const timestamp = new Date().getTime();
    const freshStaffUrl = `${STAFF_URL}${STAFF_URL.includes('?') ? '&' : '?'}t=${timestamp}`;
    Papa.parse(freshStaffUrl, {
        download: true,
        complete: (results) => {
            staffData = results.data
                .filter(r => r[0] && r[0].trim() !== "")
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
    const freshScheduleUrl = `${SCHEDULE_URL}${SCHEDULE_URL.includes('?') ? '&' : '?'}t=${timestamp}`;

    Papa.parse(freshScheduleUrl, {
        download: true,
        complete: (results) => {
            const rows = results.data;
            if (!rows || rows.length < 1) return;

            const dates = {};
            let dateCols = [];
            
            // 1. Find the Date Header (Row 1)
            const headerRow = rows[0]; 
            for (let j = 3; j < headerRow.length; j++) {
                let cellValue = headerRow[j] ? headerRow[j].trim() : "";
                if (cellValue !== "") {
                    dateCols.push({ index: j, label: cellValue });
                    dates[cellValue] = { Sala: [], Bar: [] };
                }
            }

            // 2. Process Staff Rows (Column C is Name, Column D+ are shifts)
            for (let i = 1; i < rows.length; i++) {
                let nameInSheet = rows[i][2] ? rows[i][2].trim() : "";
                if (!nameInSheet) continue;

                // Determine if they are Bar or Sala from our staff list
                const employee = staffData.find(s => s.name.toLowerCase() === nameInSheet.toLowerCase());
                const role = employee ? employee.area : 'Sala';

                dateCols.forEach(col => {
                    let shift = rows[i][col.index] ? rows[i][col.index].trim() : "";
                    
                    // If the cell has an hour (not OFF/Folga)
                    if (shift !== "" && !["OFF", "FOLGA", "F", "-"].includes(shift.toUpperCase())) {
                        if (dates[col.label]) {
                            // Extract just the start time (e.g., "09:00" from "09:00-17:00")
                            let startTime = shift.split('-')[0].trim().replace('.', ':');
                            
                            dates[col.label][role].push({
                                name: employee ? employee.name : nameInSheet,
                                time: startTime,
                                task: ""
                            });
                        }
                    }
                });
            }

            // 3. Sort by Time (Earliest first)
            Object.keys(dates).forEach(d => {
                dates[d].Sala.sort((a, b) => a.time.localeCompare(b.time));
                dates[d].Bar.sort((a, b) => a.time.localeCompare(b.time));
            });

            scheduleData = dates;
            updateDateDropdown(Object.keys(dates));
        }
    });
}

function updateDateDropdown(dateKeys) {
    const sel = document.getElementById('dateSelect');
    sel.innerHTML = dateKeys.length 
        ? dateKeys.map(d => `<option value="${d}">${d}</option>`).join('')
        : '<option>Não foram encontradas datas...</option>';
}

function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if (!day) return;

    const renderRows = (list, area) => list.map((s, i) => `
        <div style="display:flex; gap:10px; margin-bottom:12px; align-items:center;">
            <div style="min-width:140px; font-size: 14px;">
                <span style="color:#666;">${s.time}</span> <strong>${s.name}</strong>
            </div>
            <input type="text" placeholder="Tarefa..." 
                onchange="updateTask('${date}','${area}',${i},this.value)" 
                style="flex-grow:1; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>`).join('');

    let html = `<h2 style="margin-bottom:20px;">Briefing: ${date}</h2>`;
    
    html += `<div style="background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:15px;">
                <h4 style="margin-top:0; color:#d9534f;">BAR</h4>
                ${day.Bar.length ? renderRows(day.Bar, 'Bar') : "Sem staff escalado"}
             </div>`;
             
    html += `<div style="background:#f9f9f9; padding:15px; border-radius:8px;">
                <h4 style="margin-top:0; color:#337ab7;">SALA</h4>
                ${day.Sala.length ? renderRows(day.Sala, 'Sala') : "Sem staff escalado"}
             </div>`;

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
    text += day.Bar.length ? day.Bar.map(s => `${s.time} ${s.name} ${s.task}`).join('\n') : "Sem staff";
    
    text += `\n\n*SALA:*\n`;
    text += day.Sala.length ? day.Sala.map(s => `${s.time} ${s.name} ${s.task}`).join('\n') : "Sem staff";

    navigator.clipboard.writeText(text).then(() => alert("Copiado com sucesso!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
window.onload = loadStaff;
