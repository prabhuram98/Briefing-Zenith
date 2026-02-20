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
            window.staffMap = {};
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
            const rows = res.data;
            const header = rows[0];
            const dates = {};
            for (let j = 1; j < header.length; j++) {
                if (header[j] && !header[j].toLowerCase().includes("total")) {
                    dates[header[j].trim()] = { Bar: [], Sala: [] };
                }
            }
            for (let i = 1; i < rows.length; i++) {
                const info = window.staffMap[rows[i][0]?.toLowerCase().trim()];
                if (!info) continue;
                for (let j = 1; j < header.length; j++) {
                    const shift = rows[i][j]?.trim();
                    if (shift && /^\d/.test(shift)) {
                        const area = info.area.toLowerCase().includes("bar") ? "Bar" : "Sala";
                        dates[header[j].trim()][area].push({ ...info, shiftRaw: shift });
                    }
                }
            }
            window.scheduleData = dates;
            document.getElementById('dateSelect').innerHTML = Object.keys(dates).map(d => `<option value="${d}">${d}</option>`).join('');
        }
    });
}

// THE BRIEFING TEMPLATE (FIXED)
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

    const bA = bar[0] || {alias:"N/A", in:"--:--"};
    const bB = bar[1] || bA;
    const porta = sala[0] || {alias:"N/A", in:"--:--"};
    
    const bE = [...bar].sort((a,b) => a.outM - b.outM);
    const sE = [...sala].sort((a,b) => a.outM - b.outM);

    let b = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
    b += `${porta.in} Porta: ${porta.alias}\n\n`;
    b += `BAR:\n${bA.in} Abertura Sala/Bar: *${bA.alias}*\n${bA.in} Bar A: *${bA.alias}* Barista – Bebidas\n${bB.in} Bar B: *${bB.alias}* Barista – Cafés / Caixa\n\n`;
    b += `⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\nSELLERS:\n`;
    
    if(sala[1]) b += `${sala[1].in} Seller A: *${sala[1].alias}*\n`;
    if(sala[2]) b += `${sala[2].in} Seller B: *${sala[2].alias}*\n`;
    if(sala[3]) b += `${sala[3].in} Seller C: *${sala[3].alias}*\n`;
    
    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\nSeller A: Mesas 20-30\nSeller B ${sala.length > 3 ? '& C' : ''}: Mesas 1-12\n——————————————\n\n`;
    
    b += `HACCP / LIMPEZA BAR:\n${bE[0]?.out} Preparações Bar: *${bE[0]?.alias}*\n${bE[bE.length-1]?.out} Fecho Bar: *${bE[bE.length-1]?.alias}*\n\n`;
    
    b += `HACCP / SALA:\n${sE[0]?.out} Fecho do sala de cima: *${sE[0]?.alias}*\n${sE[0]?.out} Limpeza e reposição aparador: *${sE[0]?.alias}*\n`;
    if(sE[1]) b += `${sE[1]?.out} Repor papel (WC): *${sE[1]?.alias}*\n`;
    b += `${sE[sE.length-1]?.out} Fecho Sala: *${sE[sE.length-1]?.alias}*`;

    document.getElementById('modalResult').innerHTML = `<pre id="cText">${b}</pre><button class="zen-btn-close" style="background:#3E2723; color:#DCC7B1; width:100%; border:none; padding:15px; border-radius:10px;" onclick="copyB()">COPY TO WHATSAPP</button>`;
    document.getElementById('modal').style.display = 'flex';
}

function copyB() {
    navigator.clipboard.writeText(document.getElementById('cText').innerText).then(() => alert("Copied!"));
}

function openPage(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dock-item').forEach(d => d.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    el.classList.add('active');
    if (id === 'manageStaffPage') renderStaff();
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
