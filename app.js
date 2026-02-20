const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; 
let scheduleData = {}; 
const POSITION_ORDER = { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "RUNNER": 6, "STAFF": 7 };

// --- NAVIGATION (FIXED) ---
function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
        if (pageId === 'dailyViewPage') renderDailyView(); // Re-render if switching to view
    }
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

// --- DATA HANDLING ---
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
                    if (/^\d/.test(shift)) {
                        dates[col.label][info.area].push({ ...info, shiftRaw: shift, displayName: info.alias });
                    }
                });
            }
            scheduleData = dates;
            const select = document.getElementById('dateSelect');
            if(select) select.innerHTML = Object.keys(dates).map(k => `<option value="${k}">${k}</option>`).join('');
            icons.forEach(i => i.classList.remove('spinning'));
        }
    });
}

// --- BRIEFING LOGIC (FIXED ASSIGNMENTS) ---
function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayData = scheduleData[selectedDate];
    if (!dayData) return alert("No staff found.");

    const parseTime = (t) => {
        const m = t.match(/(\d{1,2})[:h](\d{2})/);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
    };

    const processShift = (s) => {
        const pts = s.shiftRaw.split(/[-–]/);
        return {
            ...s,
            entryLabel: (pts[0] || "09:00").trim().replace('h', ':'),
            exitLabel: (pts[1] || "17:30").trim().replace('h', ':'),
            entryMin: parseTime(pts[0] || "09:00"),
            exitMin: parseTime(pts[1] || "17:30")
        };
    };

    const barActive = dayData.Bar.map(processShift).sort((a,b) => a.entryMin - b.entryMin);
    const salaActive = dayData.Sala.map(processShift).sort((a,b) => a.entryMin - b.entryMin);
    const allActive = [...barActive, ...salaActive];

    // ROLE-BASED POOLS
    const runners = allActive.filter(s => s.position === 'RUNNER');
    const headSellers = salaActive.filter(s => s.position === 'HEAD SELLER');
    const salaStaff = salaActive.filter(s => (s.position.includes('STAFF') || s.position.includes('SELLER')) && s.position !== 'MANAGER' && s.displayName.toLowerCase() !== 'ana' && s.position !== 'RUNNER');
    
    // SELLER ASSIGNMENT
    let runnerForBriefing = runners.length > 0 ? runners[0].displayName : "Todos";
    let finalSellers = [...headSellers, ...salaStaff];

    // If Head + Regular < 2, pull runner into sellers
    if (finalSellers.length < 2 && runners.length > 0) {
        finalSellers.push(runners[0]);
        runnerForBriefing = "Todos";
    }

    const sA = finalSellers[0] || { displayName: "N/A", entryLabel: "--:--" };
    const sB = finalSellers[1] || { displayName: "N/A", entryLabel: "--:--" };
    const sC = finalSellers[2];

    // PORTA & BAR
    const manager = allActive.find(s => s.position === "MANAGER");
    const porta = manager || headSellers[0] || salaActive[0] || allActive[0];
    const barA = barActive[0] || { displayName: "N/A", entryLabel: "--:--", exitLabel: "--:--" };
    const barB = barActive[1] || barA;

    // HACCP (STRICT SEPARATION)
    const bHPool = barActive.filter(s => s.position !== 'MANAGER');
    const bExit = (bHPool.length > 0 ? bHPool : barActive).sort((a,b) => a.exitMin - b.exitMin);
    const eb1 = bExit[0] || barA;
    const eb2 = bExit[1] || eb1;
    const lb = bExit[bExit.length-1] || eb1;

    const sHPool = salaActive.filter(s => s.position !== 'MANAGER');
    const sExit = (sHPool.length > 0 ? sHPool : salaActive).sort((a,b) => a.exitMin - b.exitMin);
    const es1 = sExit[0] || sA;
    const es2 = sExit[1] || es1;
    const ls = sExit[sExit.length-1] || es1;

    const caixa = headSellers[0] || allActive.find(s => s.position === "BAR MANAGER") || manager || lb || ls;

    // TEMPLATE RESTORED
    let b = `Bom dia a todos!\n\n*BRIEFING ${selectedDate}*\n\n`;
    b += `${porta.entryLabel} Porta: ${porta.displayName}\n\n`;
    b += `BAR:\n${barA.entryLabel} Abertura Sala/Bar: *${barA.displayName}*\n${barA.entryLabel} Bar A: *${barA.displayName}* Barista – Bebidas\n${barB.entryLabel} Bar B: *${barB.displayName}* Barista – Cafés / Caixa\n`;
    b += `\n⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\nSELLERS:\n`;
    b += `${sA.entryLabel} Seller A: *${sA.displayName}*\n${sB.entryLabel} Seller B: *${sB.displayName}*\n`;
    if(sC) b += `${sC.entryLabel} Seller C: *${sC.displayName}*\n`;
    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\nSeller A: Mesas 20-30\nSeller B ${sC ? '& C' : ''}: Mesas 1-12\n——————————————\n\n`;
    b += `RUNNERS:\n${runners[0] ? runners[0].entryLabel : '09:00'} Runner A e B: ${runnerForBriefing}\n——————————————\n\n`;
    b += `HACCP / LIMPEZA BAR:\n${eb1.exitLabel} Preparações Bar: *${eb1.displayName}*\n${eb2.exitLabel} Reposição Bar: *${eb2.displayName}*\n${lb.exitLabel} Fecho Bar: *${lb.displayName}*\n\n`;
    b += `HACCP / SALA:\n${es1.exitLabel} Fecho do sala de cima: *${es1.displayName}*\n${es1.exitLabel} Limpeza e reposição aparador: *${es1.displayName}*\n${es2.exitLabel} Repor papel (WC): *${es2.displayName}*\n${eb2.exitLabel} Limpeza WC (clientes/staff): *${eb2.displayName}*\n${ls.exitLabel} Limpeza de vidros: *${ls.displayName}*\n${ls.exitLabel} Fecho Sala: *${ls.displayName}*\n`;
    b += `${caixa.exitLabel} Fecho de Caixa: *${caixa.displayName}*`;

    document.getElementById('modalResult').innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${b}</pre>`;
    document.getElementById('modal').style.display = 'flex';
}

function copyBriefing() {
    navigator.clipboard.writeText(document.getElementById('modalResult').innerText).then(() => alert("Copied!"));
}

window.onload = loadData;
