// app.js - Zenith Master Controller
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec',
    SCHEDULE_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv',
    STAFF_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv'
};

window.staffMap = {}; 
window.scheduleData = {}; 

window.onload = () => loadAllData();

async function loadAllData() {
    Papa.parse(`${CONFIG.STAFF_URL}&t=${Date.now()}`, {
        download: true,
        complete: (res) => {
            res.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                window.staffMap[row[0].toLowerCase().trim()] = {
                    realName: row[0].trim(), area: row[1], position: row[2], alias: row[3] || row[0]
                };
            });
            fetchSchedule();
        }
    });
}

function fetchSchedule() {
    Papa.parse(`${CONFIG.SCHEDULE_URL}&t=${Date.now()}`, {
        download: true,
        complete: (res) => {
            const dates = {};
            const header = res.data[0];
            for (let i = 1; i < res.data.length; i++) {
                const info = window.staffMap[res.data[i][0]?.toLowerCase().trim()];
                if (!info) continue;
                for (let j = 1; j < header.length; j++) {
                    const shift = res.data[i][j]?.trim();
                    if (shift && /^\d/.test(shift)) {
                        const dLabel = header[j].trim();
                        if (!dates[dLabel]) dates[dLabel] = { Bar: [], Sala: [] };
                        const area = info.area.toLowerCase().includes("bar") ? "Bar" : "Sala";
                        dates[dLabel][area].push({ ...info, shiftRaw: shift });
                    }
                }
            }
            window.scheduleData = dates;
            document.getElementById('dateSelect').innerHTML = Object.keys(dates).map(d => `<option value="${d}">${d}</option>`).join('');
        }
    });
}

// NAVIGATION
function openPage(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dock-item').forEach(d => d.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
    if (id === 'manageStaffPage') renderStaff();
}

// STAFF CRUD
function renderStaff() {
    let h = '';
    Object.values(window.staffMap).forEach(s => {
        h += `<div class="staff-row">
            <div><b>${s.alias}</b><br><small>${s.area} • ${s.position}</small></div>
            <span class="material-symbols-outlined" onclick="openStaffForm('${s.realName}','${s.area}','${s.position}','${s.alias}')">edit</span>
        </div>`;
    });
    document.getElementById('staffListContainer').innerHTML = h;
}

function openStaffForm(name = '', area = 'Sala', pos = 'Staff', alias = '') {
    document.getElementById('modalResult').innerHTML = `
        <div class="zen-form">
            <h3>${name ? 'Edit Staff' : 'Add Staff'}</h3>
            <input type="text" id="f_name" value="${name}" placeholder="Schedule Name" ${name?'readonly':''}>
            <input type="text" id="f_alias" value="${alias || name}" placeholder="Display Alias">
            <select id="f_area">
                <option value="Sala" ${area==='Sala'?'selected':''}>Sala</option>
                <option value="Bar" ${area==='Bar'?'selected':''}>Bar</option>
            </select>
            <input type="text" id="f_pos" value="${pos}" placeholder="Position">
            <button class="zen-btn-close" style="background:#c5a059" onclick="saveStaff()">SAVE CHANGES</button>
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
    alert("Zenith Sheet Updated!");
    closeModal();
    loadAllData();
}

// BRIEFING GENERATOR
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = window.scheduleData[date];
    if (!day) return;

    const parseM = (t) => {
        const m = t.match(/(\d{1,2})[:h](\d{2})/);
        return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
    };

    const process = (arr) => arr.map(s => {
        const pts = s.shiftRaw.split(/[-–]/);
        return { ...s, in: pts[0].replace('h',':'), out: pts[1].replace('h',':'), outM: parseM(pts[1]) };
    }).sort((a,b) => parseM(a.in) - parseM(b.in));

    const bar = process(day.Bar);
    const sala = process(day.Sala);

    const bA = bar[0] || {alias:"N/A", in:"--"};
    const bB = bar[1] || bA;
    const porta = sala[0] || {alias:"N/A", in:"--"};
    
    const bE = [...bar].sort((a,b) => a.outM - b.outM);
    const sE = [...sala].sort((a,b) => a.outM - b.outM);

    let b = `*ZENITH BRIEFING - ${date}*\n\n`;
    b += `${porta.in} Porta: ${porta.alias}\n\n`;
    b += `*BAR:*\n${bA.in} Abertura: *${bA.alias}*\n${bA.in} Bar A: *${bA.alias}*\n${bB.in} Bar B: *${bB.alias}*\n\n`;
    b += `*SELLERS:*\n`;
    if(sala[1]) b += `${sala[1].in} Seller A: *${sala[1].alias}*\n`;
    if(sala[2]) b += `${sala[2].in} Seller B: *${sala[2].alias}*\n`;
    if(sala[3]) b += `${sala[3].in} Seller C: *${sala[3].alias}*\n`;
    
    b += `\n*HACCP / LIMPEZA:*\n`;
    b += `Bar: ${bE[0]?.out} (${bE[0]?.alias}) / ${bE[bE.length-1]?.out} (${bE[bE.length-1]?.alias})\n`;
    b += `Sala: ${sE[0]?.out} (${sE[0]?.alias}) / ${sE[sE.length-1]?.out} (${sE[sE.length-1]?.alias})`;

    document.getElementById('modalResult').innerHTML = `<pre id="cText">${b}</pre><button class="zen-btn-close" style="background:#c5a059" onclick="copyB()">COPY TO WHATSAPP</button>`;
    document.getElementById('modal').style.display = 'flex';
}

function copyB() {
    navigator.clipboard.writeText(document.getElementById('cText').innerText).then(() => alert("Copied!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
