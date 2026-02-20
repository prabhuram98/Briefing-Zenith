// app.js - Advanced Dashboard Controller
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec',
    SCHEDULE_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv',
    STAFF_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv'
};

window.staffMap = {}; 
window.scheduleData = {}; 

window.onload = () => loadAllData();

async function loadAllData() {
    const icon = document.getElementById('syncIcon');
    icon.classList.add('spinning');

    Papa.parse(`${CONFIG.STAFF_URL}&t=${Date.now()}`, {
        download: true,
        complete: (results) => {
            window.staffMap = {};
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                window.staffMap[row[0].toLowerCase().trim()] = {
                    realName: row[0].trim(),
                    area: row[1]?.trim() || "Sala",
                    position: row[2]?.trim() || "Staff",
                    alias: row[3]?.trim() || row[0].trim()
                };
            });
            fetchSchedule(icon);
        }
    });
}

function fetchSchedule(icon) {
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
                const info = window.staffMap[rows[i][0]?.toLowerCase().trim()];
                if (!info) continue;

                dateCols.forEach(col => {
                    const shift = rows[i][col.index]?.trim();
                    if (shift && /^\d/.test(shift)) {
                        const area = info.area.toLowerCase().includes("bar") ? "Bar" : "Sala";
                        dates[col.label][area].push({ ...info, shiftRaw: shift });
                    }
                });
            }
            window.scheduleData = dates;
            document.getElementById('dateSelect').innerHTML = Object.keys(dates).map(k => `<option value="${k}">${k}</option>`).join('');
            icon.classList.remove('spinning');
        }
    });
}

// NAVIGATION
function openPage(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    el.classList.add('active');
    if (pageId === 'manageStaffPage') renderStaffList();
}

// CRUD
function openStaffForm(name = '', area = 'Sala', pos = 'Staff', alias = '') {
    document.getElementById('modalTitle').innerText = name ? 'Edit Staff' : 'Add New Staff';
    document.getElementById('modalResult').innerHTML = `
        <div class="crud-body">
            <input type="text" id="f_name" value="${name}" placeholder="Schedule Name" ${name?'readonly':''}>
            <input type="text" id="f_alias" value="${alias || name}" placeholder="Alias (Display Name)">
            <select id="f_area">
                <option value="Sala" ${area==='Sala'?'selected':''}>Sala</option>
                <option value="Bar" ${area==='Bar'?'selected':''}>Bar</option>
            </select>
            <input type="text" id="f_pos" value="${pos}" placeholder="Position">
            <button class="main-btn" onclick="saveStaff()">SYNC TO SHEET</button>
        </div>
    `;
    document.getElementById('modal').style.display = 'flex';
}

async function saveStaff() {
    const data = {
        action: 'upsertStaff',
        name: document.getElementById('f_name').value,
        alias: document.getElementById('f_alias').value,
        area: document.getElementById('f_area').value,
        position: document.getElementById('f_pos').value
    };
    await fetch(CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
    alert("Updated Successfully");
    closeModal();
    loadAllData();
}

// BRIEFING ENGINE
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

    const barA = barPool[0] || { alias: "N/A", in: "--:--" };
    const barB = barPool[1] || barA;
    const porta = salaPool[0] || { alias: "N/A", in: "--:--" };
    
    const bExit = [...barPool].sort((a,b) => a.outM - b.outM);
    const sExit = [...salaPool].sort((a,b) => a.outM - b.outM);

    const eb1 = bExit[0] || barA;
    const lb = bExit[bExit.length-1] || barA;
    const es1 = sExit[0] || porta;
    const es2 = sExit[1] || es1;
    const ls = sExit[sExit.length-1] || porta;

    let b = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
    b += `${porta.in} Porta: ${porta.alias}\n\n`;
    b += `BAR:\n${barA.in} Abertura Sala/Bar: *${barA.alias}*\n${barA.in} Bar A: *${barA.alias}* Barista – Bebidas\n${barB.in} Bar B: *${barB.alias}* Barista – Cafés / Caixa\n`;
    b += `\n⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\nSELLERS:\n`;
    
    if (salaPool.length > 1) b += `${salaPool[1].in} Seller A: *${salaPool[1].alias}*\n`;
    if (salaPool.length > 2) b += `${salaPool[2].in} Seller B: *${salaPool[2].alias}*\n`;
    if (salaPool.length > 3) b += `${salaPool[3].in} Seller C: *${salaPool[3].alias}*\n`;
    
    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\nSeller A: Mesas 20-30\nSeller B ${salaPool.length > 3 ? '& C' : ''}: Mesas 1-12\n——————————————\n\n`;
    b += `HACCP / LIMPEZA BAR:\n${eb1.out} Preparações Bar: *${eb1.alias}*\n${lb.out} Fecho Bar: *${lb.alias}*\n\n`;
    b += `HACCP / SALA:\n${es1.out} Fecho do sala de cima: *${es1.alias}*\n${es1.out} Limpeza e reposição aparador: *${es1.alias}*\n${es2.out} Repor papel (WC): *${es2.alias}*\n${ls.out} Fecho Sala: *${ls.alias}*`;

    document.getElementById('modalTitle').innerText = "Briefing Copy";
    document.getElementById('modalResult').innerHTML = `<pre id="copyText">${b}</pre><button class="main-btn" onclick="copyBriefing()">COPY TEXT</button>`;
    document.getElementById('modal').style.display = 'flex';
}

function renderStaffList() {
    let h = '';
    Object.values(window.staffMap).forEach(s => {
        h += `<div class="staff-row">
            <div><strong>${s.alias}</strong><br><small>${s.area} | ${s.position}</small></div>
            <button class="icon-btn" onclick="openStaffForm('${s.realName}','${s.area}','${s.position}','${s.alias}')">
                <span class="material-symbols-outlined">edit</span>
            </button>
        </div>`;
    });
    document.getElementById('staffListContainer').innerHTML = h;
}

function copyBriefing() {
    navigator.clipboard.writeText(document.getElementById('copyText').innerText).then(() => alert("Copied!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
