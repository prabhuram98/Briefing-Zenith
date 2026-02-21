const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}; let scheduleData = {};

function openPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    loadData().then(() => {
        if (id === 'editStaffPage') renderStaffList();
        if (id === 'showStaffPage') showStaffTable();
    });
}

async function loadData() {
    return new Promise((resolve) => {
        Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
            download: true,
            complete: (results) => {
                staffMap = {}; let posSet = new Set();
                results.data.forEach((row, i) => {
                    if (i === 0 || !row[0]) return;
                    const name = row[0].toLowerCase().trim();
                    staffMap[name] = { alias: row[3] || row[0], area: row[1] || 'Sala', position: row[2] || 'Staff' };
                    posSet.add(row[2] || 'Staff');
                });
                const posDropdown = document.getElementById('formPosition');
                if(posDropdown) posDropdown.innerHTML = Array.from(posSet).sort().map(p => `<option value="${p}">${p}</option>`).join('');
                Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
                    download: true,
                    complete: (sResults) => {
                        processSchedule(sResults.data);
                        resolve();
                    }
                });
            }
        });
    });
}

function processSchedule(rows) {
    const dates = {}; const header = rows[0]; let dateCols = [];
    for (let j = 1; j < header.length; j++) {
        if (header[j] && !header[j].toLowerCase().includes("total")) {
            const d = header[j].trim(); dateCols.push({ index: j, label: d }); dates[d] = [];
        }
    }
    for (let i = 1; i < rows.length; i++) {
        let name = rows[i][0]?.toString().toLowerCase().trim();
        if (!name || !staffMap[name]) continue;
        dateCols.forEach(col => {
            let shift = rows[i][col.index]?.toString().trim();
            if (shift && /\d/.test(shift) && !["OFF", "FOLGA"].includes(shift.toUpperCase())) {
                dates[col.label].push({ ...staffMap[name], shiftRaw: shift });
            }
        });
    }
    scheduleData = dates; updateDropdowns();
}

function updateDropdowns() {
    const keys = Object.keys(scheduleData);
    if(keys.length > 0) {
        const opt = keys.map(k => `<option value="${k}">${k}</option>`).join('');
        document.getElementById('dateSelect').innerHTML = opt;
        document.getElementById('manageDateSelect').innerHTML = opt;
    }
}

// --- BRIEFING LOGIC MERGED HERE ---
function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayStaff = scheduleData[selectedDate];
    if (!dayStaff || dayStaff.length === 0) return alert("No data for this date!");

    const activeStaff = dayStaff.filter(s => s.shiftRaw && /\d/.test(s.shiftRaw));
    if (activeStaff.length === 0) return alert("No staff found!");

    const getEntry = (s) => s.shiftRaw.split('-')[0].trim();
    const getExit = (s) => s.shiftRaw.split('-')[1].trim();
    const parseToMin = (t) => { const p = t.split(':'); return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); };

    const byEntry = [...activeStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...activeStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar');
    const salaEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala');
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala');

    const findStaff = (list, pos) => list.find(s => s.position.toLowerCase().includes(pos.toLowerCase()));

    let porta = findStaff(activeStaff, 'Manager') || findStaff(activeStaff, 'Head Seller') || salaEntry[0];
    const sellers = salaEntry.filter(s => !s.position.toLowerCase().includes('manager') || salaEntry.length === 1);
    const fechoCaixa = findStaff(activeStaff, 'Head Seller') || findStaff(activeStaff, 'Bar Manager') || findStaff(activeStaff, 'Manager') || salaExit[salaExit.length - 1];

    let b = `Bom dia a todos!\n\n*BRIEFING ${selectedDate.split('/')[0]}/${selectedDate.split('/')[1]}*\n\n`;
    b += `${getEntry(porta)} Porta: ${porta.alias}\n\nBAR:\n`;
    if (barEntry[0]) {
        b += `${getEntry(barEntry[0])} Abertura Sala/Bar: *${barEntry[0].alias}*\n`;
        b += `${getEntry(barEntry[0])} Bar A: *${barEntry[0].alias}* Barista – Bebidas\n`;
    }
    if (barEntry[1]) b += `${getEntry(barEntry[1])} Bar B: *${barEntry[1].alias}* Barista – Cafés / Caixa\n`;
    if (barEntry[2]) b += `${getEntry(barEntry[2])} Bar C: *${barEntry[2].alias}*\n`;
    if (barEntry[3]) b += `${getEntry(barEntry[3])} Bar D: *${barEntry[3].alias}*\n`;

    b += `\n⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\nSELLERS:\n`;
    if (sellers[0]) b += `${getEntry(sellers[0])} Seller A: *${sellers[0].alias}*\n`;
    if (sellers[1]) b += `${getEntry(sellers[1])} Seller B: *${sellers[1].alias}*\n`;
    if (sellers[2]) b += `${getEntry(sellers[2])} Seller C: *${sellers[2].alias}*\n`;

    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\n`;
    if (sellers[0]) b += `Seller A: Mesas 20-30\n`;
    if (sellers[1]) b += `Seller B & C: Mesas 1-12\n`;
    if (sellers[2]) b += `Seller C: Mesas 40-57\n`;
    b += `——————————————\n\n`;

    const runnerStaff = activeStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const runnerTxt = runnerStaff.length > 0 ? runnerStaff.map(r => r.alias).join(' e ') : "Todos";
    const runnerTime = runnerStaff.length > 0 ? getEntry(runnerStaff[0]) : (salaEntry[0] ? getEntry(salaEntry[0]) : "08:00");
    b += `RUNNERS:\n${runnerTime} Runner A e B: ${runnerTxt}\n——————————————\n\n`;

    const bE1 = barExit[0], bE2 = barExit[1], bL = barExit[barExit.length - 1];
    b += `HACCP / LIMPEZA BAR:\n`;
    if (bE1) b += `${getExit(bE1)} Preparações Bar: *${bE1.alias}*\n`;
    if (bE2) b += `${getExit(bE2)} Reposição Bar: *${bE2.alias}*\n`;
    else if (bL) b += `${getExit(bL)} Limpeza Máquina/Leites: *${bL.alias}*\n`;
    if (bL) b += `${getExit(bL)} Fecho Bar: *${bL.alias}*\n\n`;

    const sE1 = salaExit[0], sE2 = salaExit[1] || sE1, sE3 = salaExit[2], sL = salaExit[salaExit.length - 1];
    const wcS = barExit[1] ? barExit[1].alias : (sE3 ? sE3.alias : sL.alias);
    b += `HACCP / SALA:\n`;
    if (sE1) b += `${getExit(sE1)} Fecho do sala de cima: *${sE1.alias}*\n`;
    if (sE1) b += `${getExit(sE1)} Limpeza e reposição aparador/cadeiras: *${sE1.alias}*\n`;
    if (sE2) b += `${getExit(sE2)} Repor papel WC: *${sE2.alias}*\n`;
    b += `${getExit(sE2)} Limpeza WC: *${wcS}*\n`;
    b += `${getExit(sL)} Limpeza espelhos e vidros: *${sE3 ? sE3.alias : sL.alias}*\n`;
    if (sL) b += `Fecho da sala: *${sL.alias}*\n`;
    b += `${getExit(fechoCaixa)} Fecho de Caixa: *${fechoCaixa.alias}*`;

    document.getElementById('briefingTextContainer').innerText = b;
    document.getElementById('briefingModal').style.display = 'flex';
}

function copyBriefingText() {
    navigator.clipboard.writeText(document.getElementById('briefingTextContainer').innerText);
    alert("Copied!");
}

function closeBriefingModal() { document.getElementById('briefingModal').style.display = 'none'; }
// --- END MERGED LOGIC ---

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date] || [];
    const container = document.getElementById('scheduleTableWrapper');
    if (day.length === 0) { container.innerHTML = "<p>Sem dados.</p>"; return; }
    container.innerHTML = `<div class="table-container"><table><thead><tr><th>Staff</th><th>Area</th><th>Shift</th></tr></thead><tbody>${day.map(s => `<tr><td><b>${s.alias}</b></td><td>${s.area}</td><td>${s.shiftRaw}</td></tr>`).join('')}</tbody></table></div>`;
}

function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    const sorted = Object.keys(staffMap).sort();
    container.innerHTML = `<div class="table-container"><table><thead><tr><th>Alias</th><th>Pos</th><th>✎</th></tr></thead><tbody>${sorted.map(k => `<tr onclick="openStaffForm('${k}')"><td><b>${staffMap[k].alias}</b></td><td>${staffMap[k].position}</td><td>✎</td></tr>`).join('')}</tbody></table></div>`;
}

function openStaffForm(k = null) {
    if (k) {
        document.getElementById('modalTitle').innerText = "Edit Staff";
        document.getElementById('editOriginalKey').value = k;
        document.getElementById('formFullName').value = k.toUpperCase();
        document.getElementById('formAlias').value = staffMap[k].alias;
        document.getElementById('formPosition').value = staffMap[k].position;
        document.getElementById('deleteBtn').style.display = "block";
    } else {
        document.getElementById('modalTitle').innerText = "New Staff";
        document.getElementById('editOriginalKey').value = "";
        document.getElementById('formFullName').value = "";
        document.getElementById('formAlias').value = "";
        document.getElementById('deleteBtn').style.display = "none";
    }
    document.getElementById('staffModal').style.display = 'flex';
}

function closeStaffModal() { document.getElementById('staffModal').style.display = 'none'; }

async function confirmSave() {
    const fullName = document.getElementById('formFullName').value.trim().toUpperCase();
    const alias = document.getElementById('formAlias').value.trim();
    const pos = document.getElementById('formPosition').value;
    const key = document.getElementById('editOriginalKey').value;
    if (!fullName || !alias) return alert("Fill all fields!");
    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: key ? 'update' : 'add', originalKey: key, fullName, alias, position: pos, area: staffMap[key?.toLowerCase()]?.area || 'Sala' }) });
        closeStaffModal(); loadData();
    } catch (e) { alert("Error"); }
}

async function confirmDelete() {
    const key = document.getElementById('editOriginalKey').value;
    if (!confirm(`Delete ${key}?`)) return;
    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'delete', originalKey: key }) });
        closeStaffModal(); loadData();
    } catch (e) { alert("Error"); }
}

window.onload = loadData;
