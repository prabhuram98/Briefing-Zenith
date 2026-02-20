const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "RUNNER": 6, "STAFF": 7 };

// --- DATA INITIALIZATION ---

async function loadData() {
    const syncIcons = document.querySelectorAll('.sync-small');
    syncIcons.forEach(i => i.classList.add('spinning'));
    
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
            loadSchedule(syncIcons);
        }
    });
}

function loadSchedule(icons) {
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
                const info = staffMap[nameInSched];
                if (!info) continue;

                dateCols.forEach(col => {
                    let shift = rows[i][col.index]?.toString().trim() || "";
                    // STRICT FILTER: Must start with number (Blocks OFF.1, FOLGA, etc)
                    if (/^\d/.test(shift)) {
                        dates[col.label][info.area].push({ ...info, shiftRaw: shift, displayName: info.alias });
                    }
                });
            }

            scheduleData = dates;
            const dateKeys = Object.keys(dates);
            if(dateKeys.length > 0) {
                document.getElementById('dateSelect').innerHTML = dateKeys.map(k => `<option value="${k}">${k}</option>`).join('');
            }
            icons.forEach(i => i.classList.remove('spinning'));
        }
    });
}

// --- BRIEFING GENERATION ---

function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayData = scheduleData[selectedDate];
    if (!dayData) return alert("No data.");

    const parseTime = (t) => {
        const m = t.match(/(\d{1,2})[:h](\d{2})/);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
    };

    const processShift = (s) => {
        const pts = s.shiftRaw.split(/[-–]/);
        return {
            ...s,
            entryMin: parseTime(pts[0] || "09:00"),
            exitMin: parseTime(pts[1] || "17:30"),
            entryLabel: (pts[0] || "09:00").trim().replace('h', ':'),
            exitLabel: (pts[1] || "17:30").trim().replace('h', ':')
        };
    };

    // 1. Separate Active Pools
    const barActive = dayData.Bar.map(processShift).sort((a,b) => a.entryMin - b.entryMin);
    const salaActive = dayData.Sala.map(processShift).sort((a,b) => a.entryMin - b.entryMin);
    const allActive = [...barActive, ...salaActive];

    // 2. Specialized Exit Sorts
    const exitingBar = [...barActive].sort((a,b) => a.exitMin - b.exitMin);
    const exitingSala = [...salaActive].sort((a,b) => a.exitMin - b.exitMin);

    // 3. Porta
    const manager = allActive.find(s => s.position === "MANAGER");
    const headSeller = allActive.find(s => s.position === "HEAD SELLER");
    const porta = manager || headSeller || salaActive[0] || barActive[0];

    // 4. Bar (Bar Staff Only)
    const barA = barActive[0] || { displayName: "N/A", entryLabel: "--:--", exitLabel: "--:--" };
    const barB = barActive[1] || barA;

    // 5. Sellers (Sala Staff Only - Filtered)
    let sPool = salaActive.filter(s => s.position !== 'MANAGER' && s.displayName.toLowerCase() !== 'ana');
    if (sPool.length === 0) sPool = salaActive; 

    const sA = sPool[0] || { displayName: "N/A", entryLabel: "--:--", exitLabel: "--:--" };
    const sB = sPool[1] || sA;
    const sC = sPool[2];

    // 6. HACCP Assignments (Bar to Bar, Sala to Sala)
    const haccpBar1 = exitingBar[0] || barA;
    const haccpBarLast = exitingBar[exitingBar.length-1] || barA;
    
    const haccpSala1 = exitingSala[0] || sA;
    const haccpSalaLast = exitingSala[exitingSala.length-1] || sA;

    // 7. Fecho de Caixa
    const caixa = headSeller || allActive.find(s => s.position === "BAR MANAGER") || manager || haccpBarLast || haccpSalaLast;

    // --- TEMPLATE ---
    let b = `Bom dia a todos!\n\n*BRIEFING ${selectedDate}*\n\n`;
    b += `${porta.entryLabel} Porta: ${porta.displayName}\n\n`;
    
    b += `BAR:\n`;
    b += `${barA.entryLabel} Bar A: *${barA.displayName}*\n`;
    b += `${barB.entryLabel} Bar B: *${barB.displayName}*\n\n`;

    b += `SELLERS:\n`;
    b += `${sA.entryLabel} Seller A: *${sA.displayName}*\n`;
    b += `${sB.entryLabel} Seller B: *${sB.displayName}*\n`;
    if(sC) b += `${sC.entryLabel} Seller C: *${sC.displayName}*\n`;
    
    b += `\n⸻⸻⸻⸻\n\n`;
    
    b += `HACCP BAR:\n`;
    b += `${haccpBar1.exitLabel} Preparações/Reposição: *${haccpBar1.displayName}*\n`;
    b += `${haccpBarLast.exitLabel} Fecho Bar: *${haccpBarLast.displayName}*\n\n`;
    
    b += `HACCP SALA:\n`;
    b += `${haccpSala1.exitLabel} Fecho cima / Reposição: *${haccpSala1.displayName}*\n`;
    b += `${haccpSalaLast.exitLabel} Limpeza Vidros / Fecho Sala: *${haccpSalaLast.displayName}*\n\n`;
    
    b += `${caixa.exitLabel} Fecho Caixa: *${caixa.displayName}*`;

    document.getElementById('modalResult').innerHTML = `<pre>${b}</pre>`;
    document.getElementById('modal').style.display = 'flex';
}

function openPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}
function closeModal() { document.getElementById('modal').style.display = 'none'; }
function copyBriefing() {
    navigator.clipboard.writeText(document.getElementById('modalResult').innerText).then(() => alert("Copied!"));
}

window.onload = loadData;
