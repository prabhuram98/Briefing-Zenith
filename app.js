// app.js - Optimized Premium Engine
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec',
    SCHEDULE_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv',
    STAFF_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv'
};

window.staffMap = {}; 
window.scheduleData = {}; 

window.onload = () => {
    document.getElementById('currentDateDisplay').innerText = new Date().toDateString();
    loadAllData();
};

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

function openPage(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dock-item').forEach(d => d.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
    if (id === 'manageStaffPage') renderStaff();
}

function renderStaff() {
    let h = '';
    Object.values(window.staffMap).forEach(s => {
        h += `<div class="staff-item">
            <div><b>${s.alias}</b><br><small>${s.area}</small></div>
            <span class="material-symbols-outlined" onclick="openStaffForm('${s.realName}','${s.area}','${s.position}','${s.alias}')">edit</span>
        </div>`;
    });
    document.getElementById('staffListContainer').innerHTML = h;
}

// RESTORED BRIEFING TEMPLATE
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

    let b = `Bom dia!\n\n*BRIEFING ${date}*\n\n`;
    b += `${porta.in} Porta: ${porta.alias}\n\n`;
    b += `BAR:\n${bA.in} Abertura: *${bA.alias}*\n${bA.in} Bar A: *${bA.alias}* (Bebidas)\n${bB.in} Bar B: *${bB.alias}* (Cafés)\n\n`;
    b += `‼️ Loiça é de todos.\n\nSELLERS:\n`;
    if(sala[1]) b += `${sala[1].in} Seller A: *${sala[1].alias}*\n`;
    if(sala[2]) b += `${sala[2].in} Seller B: *${sala[2].alias}*\n`;
    if(sala[3]) b += `${sala[3].in} Seller C: *${sala[3].alias}*\n`;
    
    b += `\nHACCP BAR:\n${bE[0]?.out} Preparações: ${bE[0]?.alias}\n${bE[bE.length-1]?.out} Fecho: ${bE[bE.length-1]?.alias}\n\n`;
    b += `HACCP SALA:\n${sE[0]?.out} Fecho Cima/Aparador: ${sE[0]?.alias}\n${sE[sE.length-1]?.out} Fecho Sala: ${sE[sE.length-1]?.alias}`;

    document.getElementById('modalResult').innerHTML = `<pre id="cText" style="text-align:left">${b}</pre><button class="big-card primary" style="padding:15px; margin-top:10px;" onclick="copyB()">COPY</button>`;
    document.getElementById('modal').style.display = 'flex';
}

function copyB() {
    navigator.clipboard.writeText(document.getElementById('cText').innerText).then(() => alert("Copied!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
