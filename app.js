const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "RUNNER": 6, "STAFF": 7 };

// --- DATA INITIALIZATION ---

async function loadData() {
    const icons = document.querySelectorAll('.sync-small');
    icons.forEach(i => i.classList.add('spinning'));
    const startTime = Date.now();

    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true, header: false, skipEmptyLines: true,
        complete: function(results) {
            staffMap = {}; 
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const rawName = row[0].toString().toLowerCase().trim();
                const area = row[1] ? row[1].toString().trim() : "Sala";
                const pos = row[2] ? row[2].toString().trim().toUpperCase() : "STAFF";
                const alias = row[3] ? row[3].toString().trim() : row[0].trim();
                staffMap[rawName] = { 
                    alias: alias, 
                    area: area.toLowerCase().includes('bar') ? 'Bar' : 'Sala', 
                    position: pos, 
                    priority: POSITION_ORDER[pos] || 99 
                };
            });
            loadSchedule(icons, startTime);
        }
    });
}

function loadSchedule(icons, startTime) {
    Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
        download: true, header: false, skipEmptyLines: true,
        complete: function(results) {
            const dates = {}; 
            const rows = results.data;
            if (rows.length < 1) return;
            const header = rows[0]; 
            let dateCols = [];

            for (let j = 1; j < header.length; j++) {
                const colName = header[j]?.trim();
                if (colName && !colName.toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: colName });
                    dates[colName] = { Sala: [], Bar: [] };
                }
            }

            for (let i = 1; i < rows.length; i++) {
                let nameInSched = rows[i][0]?.toString().toLowerCase().trim();
                if (!nameInSched) continue;
                
                const info = staffMap[nameInSched];
                if (!info) continue;

                dateCols.forEach(col => {
                    let shift = rows[i][col.index]?.toString().trim() || "";
                    
                    // STRICT FILTER: Check if shift STARTS with a number. 
                    // This blocks "OFF.1", "FOLGA", "OFF", etc.
                    const startsWithNumber = /^\d/.test(shift);
                    const isOff = /OFF|FOLGA|VACATION|FERIAS|X/i.test(shift);

                    if (startsWithNumber && !isOff) {
                        dates[col.label][info.area].push({ 
                            ...info, 
                            shiftRaw: shift, 
                            displayName: info.alias 
                        });
                    }
                });
            }

            scheduleData = dates;
            const dateKeys = Object.keys(dates);
            if(dateKeys.length > 0) {
                document.getElementById('dateSelect').innerHTML = dateKeys.map(k => `<option value="${k}">${k}</option>`).join('');
            }
            const elapsed = Date.now() - startTime;
            setTimeout(() => icons.forEach(i => i.classList.remove('spinning')), Math.max(0, 600 - elapsed));
        }
    });
}

// --- BRIEFING GENERATION ---

function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayData = scheduleData[selectedDate];

    if (!dayData || (dayData.Sala.length === 0 && dayData.Bar.length === 0)) {
        return alert("No staff working on " + selectedDate);
    }

    const parseTime = (t) => {
        const m = t.match(/(\d{1,2})[:h](\d{2})/);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
    };

    // Filter list for TODAY ONLY
    let todayStaff = [...dayData.Bar, ...dayData.Sala].map(s => {
        const pts = s.shiftRaw.split(/[-–]/);
        return {
            ...s,
            entryMin: parseTime(pts[0] || "00:00"),
            exitMin: parseTime(pts[1] || "00:00"),
            entryLabel: (pts[0] || "00:00").trim().replace('h', ':'),
            exitLabel: (pts[1] || "00:00").trim().replace('h', ':')
        };
    });

    const barStaff = todayStaff.filter(s => s.area === 'Bar').sort((a,b) => a.entryMin - b.entryMin);
    const salaStaff = todayStaff.filter(s => s.area === 'Sala').sort((a,b) => a.entryMin - b.entryMin);
    const exitingBar = [...barStaff].sort((a,b) => a.exitMin - b.exitMin);
    const exitingSala = [...salaStaff].sort((a,b) => a.exitMin - b.exitMin);

    // PORTA: Manager -> Head Seller -> Earliest Sala
    const manager = todayStaff.find(s => s.position === "MANAGER");
    const headSeller = todayStaff.find(s => s.position === "HEAD SELLER");
    const porta = manager || headSeller || salaStaff[0] || todayStaff[0];

    // SELLERS: No Manager if others exist. No "Ana" if others exist.
    let sPool = salaStaff.filter(s => s.position !== 'MANAGER');
    const filteredPool = sPool.filter(s => s.displayName.toLowerCase() !== 'ana');
    if (filteredPool.length > 0) sPool = filteredPool;
    if (sPool.length === 0) sPool = salaStaff;

    const sA = sPool[0];
    const sB = sPool[1] || sA;
    const sC = sPool[2];

    // FECHO DE CAIXA Priority
    const caixa = headSeller || todayStaff.find(s => s.position === "BAR MANAGER") || manager || exitingBar[exitingBar.length-1];

    // --- TEMPLATE ---
    let b = `Bom dia a todos!\n\n*BRIEFING ${selectedDate}*\n\n`;
    b += `${porta?.entryLabel || '09:00'} Porta: ${porta?.displayName || '---'}\n\n`;
    
    b += `BAR:\n`;
    b += `${barStaff[0]?.entryLabel || '07:30'} Abertura: *${barStaff[0]?.displayName || '---'}*\n`;
    b += `${barStaff[0]?.entryLabel || '07:30'} Bar A: *${barStaff[0]?.displayName || '---'}*\n`;
    b += `${barStaff[1]?.entryLabel || '08:00'} Bar B: *${barStaff[1]?.displayName || '---'}*\n\n`;

    b += `⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\n——————————————\n\nSELLERS:\n`;
    if(sA) b += `${sA.entryLabel} Seller A: *${sA.displayName}*\n`;
    if(sB && sB !== sA) b += `${sB.entryLabel} Seller B: *${sB.displayName}*\n`;
    if(sC) b += `${sC.entryLabel} Seller C: *${sC.displayName}*\n`;
    
    b += `\n⚠ Pastéis de Nata ⚠\n——————————————\nSeller A: Mesas 20-30\nSeller B ${sC ? '& C' : ''}: Mesas 1-12\n——————————————\n\n`;

    const eb1 = exitingBar[0], eb2 = exitingBar[1] || eb1, lb = exitingBar[exitingBar.length-1];
    const es1 = exitingSala[0], es2 = exitingSala[1] || es1, ls = exitingSala[exitingSala.length-1];

    b += `HACCP BAR:\n16:00 Preparações: *${eb1?.displayName || '---'}*\n16:00 Reposição: *${eb2?.displayName || '---'}*\n17:30 Fecho: *${lb?.displayName || '---'}*\n\n`;
    b += `HACCP SALA:\n16:00- Fecho cima: *${es1?.displayName || '---'}*\n17:30- Vidros: *${ls?.displayName || '---'}*\n`;
    b += `${exitingBar[exitingBar.length-1]?.exitLabel || '17:30'} Fecho Caixa: *${caixa?.displayName || '---'}*`;

    document.getElementById('modalResult').innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${b}</pre>`;
    document.getElementById('modal').style.display = 'flex';
}

function copyBriefing() {
    navigator.clipboard.writeText(document.getElementById('modalResult').innerText).then(() => alert("Copied!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
window.onload = loadData;
