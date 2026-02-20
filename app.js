const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyXw6HhEm_DCNIZOuTaDta8Pm4GyYT-rtbbFrkYrGSE74KWq6wpnJ8qOn_5JL4V6d8-pg/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

let staffMap = {}, scheduleData = {};

// 1. NAVIGATION FIX - THIS MAKES ICONS WORK
function openPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    
    // Show the clicked page
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
    }

    // Trigger data render if going to specific pages
    if (pageId === 'editStaffPage') renderStaffList();
    if (pageId === 'showStaffPage') showStaffTable();
}

// 2. DATA LOADING
async function loadData() {
    const btn = document.getElementById('refreshBtn');
    if(btn) btn.classList.add('spinning');

    Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
        download: true,
        complete: (results) => {
            staffMap = {};
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const key = row[0].toLowerCase().trim();
                staffMap[key] = { 
                    alias: row[3] || row[0], 
                    area: (row[1]||'').toLowerCase().includes('bar') ? 'Bar' : 'Sala',
                    position: row[2] || "STAFF"
                };
            });
            loadSchedule(btn);
        }
    });
}

function loadSchedule(refreshBtn) {
    Papa.parse(`${SCHEDULE_URL}&t=${new Date().getTime()}`, {
        download: true,
        complete: (results) => {
            const dates = {}; const rows = results.data;
            if (rows.length < 2) return;
            const header = rows[0];
            
            for (let j = 1; j < header.length; j++) {
                if (header[j] && !header[j].toLowerCase().includes("total")) {
                    dates[header[j].trim()] = { Sala: [], Bar: [] };
                }
            }

            for (let i = 1; i < rows.length; i++) {
                let name = rows[i][0]?.toLowerCase().trim();
                if (!name || !staffMap[name]) continue;
                const info = staffMap[name];
                for (let j = 1; j < header.length; j++) {
                    let shift = rows[i][j]?.trim();
                    if (shift && /\d/.test(shift)) {
                        dates[header[j].trim()][info.area].push({ alias: info.alias, shiftRaw: shift, position: info.position });
                    }
                }
            }
            scheduleData = dates;
            updateDropdowns();
            if(refreshBtn) refreshBtn.classList.remove('spinning');
        }
    });
}

function updateDropdowns() {
    const keys = Object.keys(scheduleData);
    if(keys.length > 0) {
        const opt = keys.map(k => `<option value="${k}">${k}</option>`).join('');
        document.getElementById('dateSelect').innerHTML = opt;
        document.getElementById('manageDateSelect').innerHTML = opt;
    }
}

// 3. BRIEFING GENERATOR
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
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

    let b = `*BRIEFING ${date}*\n\n`;
    b += `${porta.in} Porta: ${porta.alias}\n\n`;
    b += `BAR:\n${bA.in} Abertura: *${bA.alias}*\n${bB.in} Bar B: *${bB.alias}*\n\n`;
    b += `SELLERS:\n`;
    if(sala[1]) b += `${sala[1].in} Seller A: *${sala[1].alias}*\n`;
    if(sala[2]) b += `${sala[2].in} Seller B: *${sala[2].alias}*\n`;

    document.getElementById('modalResult').innerHTML = `<pre id="cText" style="white-space:pre-wrap; text-align:left;">${b}</pre>`;
    document.getElementById('modal').style.display = 'flex';
}

function copyBriefing() {
    const text = document.getElementById('cText').innerText;
    navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

// Run load on start
window.onload = loadData;
