// app.js - Full Professional Version
window.staffMap = {}; 
window.scheduleData = {}; 

const CONFIG = {
    SCHEDULE_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv',
    STAFF_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv'
};

window.onload = () => loadAllData();

async function loadAllData() {
    const syncIcons = document.querySelectorAll('.sync-small');
    syncIcons.forEach(i => i.classList.add('spinning'));

    Papa.parse(`${CONFIG.STAFF_URL}&t=${Date.now()}`, {
        download: true,
        complete: (results) => {
            window.staffMap = {};
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const rawName = row[0].toLowerCase().trim();
                window.staffMap[rawName] = {
                    realName: row[0].trim(),
                    area: row[1]?.trim() || "Sala",
                    position: row[2]?.trim() || "Staff",
                    alias: row[3]?.trim() || row[0].trim()
                };
            });
            fetchSchedule(syncIcons);
        }
    });
}

function fetchSchedule(icons) {
    Papa.parse(`${CONFIG.SCHEDULE_URL}&t=${Date.now()}`, {
        download: true,
        complete: (results) => {
            const rows = results.data;
            const header = rows[0];
            const dates = {};
            let dateCols = [];

            for (let j = 1; j < header.length; j++) {
                if (header[j] && !header[j].toLowerCase().includes("total")) {
                    dateCols.push({ index: j, label: header[j].trim() });
                    dates[header[j].trim()] = { Bar: [], Sala: [] }; 
                }
            }

            for (let i = 1; i < rows.length; i++) {
                const nameKey = rows[i][0]?.toLowerCase().trim();
                const info = window.staffMap[nameKey];
                if (!info) continue;

                dateCols.forEach(col => {
                    const shift = rows[i][col.index]?.trim();
                    if (shift && /^\d/.test(shift)) {
                        const targetArea = info.area.toLowerCase().includes("bar") ? "Bar" : "Sala";
                        dates[col.label][targetArea].push({ ...info, shiftRaw: shift });
                    }
                });
            }
            window.scheduleData = dates;
            refreshDropdown();
            icons.forEach(i => i.classList.remove('spinning'));
        }
    });
}

function refreshDropdown() {
    const select = document.getElementById('dateSelect');
    if (select) {
        const keys = Object.keys(window.scheduleData);
        select.innerHTML = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    }
}

// --- GENERATE BRIEFING ---
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const dayData = window.scheduleData[date];
    if (!dayData) return;

    const parseM = (t) => {
        const m = t.match(/(\d{1,2})[:h](\d{2})/);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
    };

    const process = (staff) => staff.map(s => {
        const pts = s.shiftRaw.split(/[-–]/);
        return { 
            ...s, 
            in: (pts[0] || "09:00").replace('h', ':'), 
            out: (pts[1] || "17:30").replace('h', ':'),
            inM: parseM(pts[0] || "09:00"),
            outM: parseM(pts[1] || "17:30")
        };
    }).sort((a,b) => a.inM - b.inM);

    const barPool = process(dayData.Bar);
    const salaPool = process(dayData.Sala);

    // Dynamic Logic
    const barA = barPool[0] || { alias: "N/A", in: "--:--" };
    const barB = barPool[1] || barA;
    const porta = salaPool[0] || { alias: "N/A", in: "--:--" };
    
    // HACCP Logic (Sorted by Exit Time)
    const bExit = [...barPool].sort((a,b) => a.outM - b.outM);
    const sExit = [...salaPool].sort((a,b) => a.outM - b.outM);

    const eb1 = bExit[0] || barA;
    const lb = bExit[bExit.length-1] || barA;
    const es1 = sExit[0] || porta;
    const es2 = sExit[1] || es1;
    const ls = sExit[sExit.length-1] || porta;

    // --- TEMPLATE BUILDING ---
    let b = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
    b += `${porta.in} Porta: ${porta.alias}\n\n`;
    
    b += `BAR:\n`;
    b += `${barA.in} Abertura Sala/Bar: *${barA.alias}*\n`;
    b += `${barA.in} Bar A: *${barA.alias}* Barista – Bebidas\n`;
    b += `${barB.in} Bar B: *${barB.alias}* Barista – Cafés / Caixa\n`;
    
    b += `\n⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\nSELLERS:\n`;
    
    // Seller Logic
    if (salaPool.length > 1) b += `${salaPool[1].in} Seller A: *${salaPool[1].alias}*\n`;
    if (salaPool.length > 2) b += `${salaPool[2].in} Seller B: *${salaPool[2].alias}*\n`;
    if (salaPool.length > 3) b += `${salaPool[3].in} Seller C: *${salaPool[3].alias}*\n`;
    
    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\nSeller A: Mesas 20-30\nSeller B ${salaPool.length > 3 ? '& C' : ''}: Mesas 1-12\n——————————————\n\n`;
    
    b += `HACCP / LIMPEZA BAR:\n`;
    b += `${eb1.out} Preparações Bar: *${eb1.alias}*\n`;
    b += `${lb.out} Fecho Bar: *${lb.alias}*\n\n`;
    
    b += `HACCP / SALA:\n`;
    b += `${es1.out} Fecho do sala de cima: *${es1.alias}*\n`;
    b += `${es1.out} Limpeza e reposição aparador: *${es1.alias}*\n`;
    b += `${es2.out} Repor papel (WC): *${es2.alias}*\n`;
    b += `${ls.out} Fecho Sala: *${ls.alias}*`;

    const resArea = document.getElementById('modalResult');
    resArea.innerHTML = `<pre style="white-space:pre-wrap; font-family:inherit;">${b}</pre>
                        <button class="main-btn" onclick="copyBriefing()">Copy Briefing</button>`;
    document.getElementById('modal').style.display = 'flex';
}

function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'manageStaffPage') renderDirectory();
    if (pageId === 'dailyViewPage') renderDaily();
}

function renderDirectory() {
    let h = '<h3>Staff Directory</h3><table style="width:100%; border-collapse:collapse;">';
    Object.values(window.staffMap).forEach(s => {
        h += `<tr style="border-bottom:1px solid #ddd;"><td>${s.alias}</td><td>${s.area}</td><td>${s.position}</td></tr>`;
    });
    document.getElementById('staffListContainer').innerHTML = h + '</table>';
}

function renderDaily() {
    const d = document.getElementById('dateSelect').value;
    const data = window.scheduleData[d];
    if (!data) return;
    let h = `<h3>${d}</h3><table style="width:100%; border-collapse:collapse;">`;
    [...data.Bar, ...data.Sala].forEach(s => {
        h += `<tr><td><b>${s.area}</b></td><td>${s.alias}</td><td>${s.shiftRaw}</td></tr>`;
    });
    document.getElementById('dailyViewContainer').innerHTML = h + '</table>';
}

function copyBriefing() {
    const text = document.querySelector('#modalResult pre').innerText;
    navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
