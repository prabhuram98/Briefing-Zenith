// app.js - Optimized for 2026
const CONFIG = {
    SCHEDULE_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv',
    STAFF_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv',
    POSITIONS: { "MANAGER": 1, "BAR MANAGER": 2, "HEAD SELLER": 3, "BAR STAFF": 4, "SALA STAFF": 5, "RUNNER": 6, "STAFF": 7 }
};

window.staffMap = {};
window.scheduleData = {};

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Ready. Fetching Data...");
    fetchData();
});

async function fetchData() {
    // 1. Fetch Staff Database
    Papa.parse(`${CONFIG.STAFF_URL}&t=${Date.now()}`, {
        download: true,
        complete: (results) => {
            results.data.forEach((row, i) => {
                if (i === 0 || !row[0]) return;
                const name = row[0].toLowerCase().trim();
                window.staffMap[name] = {
                    realName: row[0].trim(),
                    area: row[1]?.trim() || "Sala",
                    position: row[2]?.toUpperCase().trim() || "STAFF",
                    alias: row[3]?.trim() || row[0].trim()
                };
            });
            // 2. Fetch Schedule
            fetchSchedule();
        }
    });
}

function fetchSchedule() {
    Papa.parse(`${CONFIG.SCHEDULE_URL}&t=${Date.now()}`, {
        download: true,
        complete: (results) => {
            const rows = results.data;
            if (rows.length < 1) return;
            const header = rows[0];
            const dates = {};
            let dateIndices = [];

            // Find valid date columns
            for (let j = 1; j < header.length; j++) {
                if (header[j] && !header[j].toLowerCase().includes("total")) {
                    dateIndices.push({ index: j, label: header[j].trim() });
                    dates[header[j].trim()] = { Bar: [], Sala: [] };
                }
            }

            // Map shifts
            for (let i = 1; i < rows.length; i++) {
                const name = rows[i][0]?.toLowerCase().trim();
                const staffInfo = window.staffMap[name];
                if (!staffInfo) continue;

                dateIndices.forEach(col => {
                    const shift = rows[i][col.index]?.trim();
                    if (shift && /^\d/.test(shift)) {
                        const isBar = staffInfo.area.toLowerCase().includes("bar");
                        dates[col.label][isBar ? "Bar" : "Sala"].push({
                            ...staffInfo,
                            shiftRaw: shift
                        });
                    }
                });
            }
            window.scheduleData = dates;
            populateDropdown();
        }
    });
}

function populateDropdown() {
    const select = document.getElementById('dateSelect');
    const keys = Object.keys(window.scheduleData);
    if (select && keys.length > 0) {
        select.innerHTML = keys.map(k => `<option value="${k}">${k}</option>`).join('');
    }
}

// Navigation
function openPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'manageStaffPage') renderDirectory();
    if (pageId === 'dailyViewPage') renderDaily();
}

function renderDirectory() {
    let html = '<h3>Staff List</h3><table><tr><th>Alias</th><th>Area</th><th>Role</th></tr>';
    Object.values(window.staffMap).forEach(s => {
        html += `<tr><td>${s.alias}</td><td>${s.area}</td><td>${s.position}</td></tr>`;
    });
    document.getElementById('staffListContainer').innerHTML = html + '</table>';
}

function renderDaily() {
    const date = document.getElementById('dateSelect').value;
    const data = window.scheduleData[date];
    if (!data) return;
    const all = [...data.Bar, ...data.Sala];
    let html = `<h3>${date}</h3><table>`;
    all.forEach(s => { html += `<tr><td>${s.alias}</td><td>${s.shiftRaw}</td></tr>`; });
    document.getElementById('dailyViewContainer').innerHTML = html + '</table>';
}

// BRIEFING LOGIC
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = window.scheduleData[date];
    if (!day) return alert("Select date first");

    const parseT = (t) => {
        const m = t.match(/(\d{1,2})[:h](\d{2})/);
        return m ? parseInt(m[1])*60 + parseInt(m[2]) : 0;
    };

    const process = (arr) => arr.map(s => {
        const pts = s.shiftRaw.split(/[-–]/);
        return { ...s, 
            in: pts[0]?.replace('h', ':') || "09:00", 
            out: pts[1]?.replace('h', ':') || "17:00",
            outM: parseT(pts[1] || "17:00")
        };
    }).sort((a,b) => parseT(a.in) - parseT(b.in));

    const bar = process(day.Bar);
    const sala = process(day.Sala);

    // Filter logic
    const runners = [...bar, ...sala].filter(s => s.position === "RUNNER");
    const sellers = sala.filter(s => s.position.includes("SELLER") || s.position.includes("STAFF"));
    
    // Bar Tasks (eb = earliest bar, lb = latest bar)
    const eb1 = bar[0] || {alias: "N/A", in:"--", out:"--"};
    const lb = [...bar].sort((a,b) => b.outM - a.outM)[0] || eb1;

    // Sala Tasks (es = earliest sala, ls = latest sala)
    const es1 = sala[0] || {alias: "N/A", in:"--", out:"--"};
    const ls = [...sala].sort((a,b) => b.outM - a.outM)[0] || es1;

    let b = `*BRIEFING ${date}*\n\n`;
    b += `BAR:\n- Abertura: ${eb1.alias} (${eb1.in})\n- Fecho: ${lb.alias} (${lb.out})\n\n`;
    b += `SALA:\n- Porta: ${es1.alias} (${es1.in})\n- Fecho Sala: ${ls.alias} (${ls.out})\n\n`;
    b += `SELLERS:\n- ${sellers.map(s => s.alias).join(', ') || 'N/A'}\n\n`;
    b += `‼️ Bar staff only handle Bar tasks. Sala staff handle Sala tasks.`;

    document.getElementById('modalResult').innerHTML = `<pre>${b}</pre><button onclick="copyB()">Copy</button>`;
    document.getElementById('modal').style.display = 'block';
}

function copyB() {
    navigator.clipboard.writeText(document.getElementById('modalResult').innerText).then(() => alert("Copied!"));
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
