// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=0&single=true&output=csv'; 
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=609693221&single=true&output=csv';


let staffData = [];
let scheduleData = {};

// --- NAVIGATION ---
function switchPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) targetPage.classList.add('active');

    btn.classList.add('active');
    const title = document.getElementById('pageTitle');
    if (title) title.innerText = pageId.toUpperCase();
}

// --- DATA LOADING ---
async function loadStaff() {
    console.log("Fetching Master Staff List...");
    const freshStaffUrl = STAFF_URL + (STAFF_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();

    Papa.parse(freshStaffUrl, {
        download: true,
        complete: (results) => {
            // Clean staff data: remove header, trim spaces
            staffData = results.data
                .filter(r => r[0] && r[0].toLowerCase() !== "name")
                .map(r => ({ 
                    name: r[0].trim(), 
                    area: r[1] ? r[1].trim() : 'Sala' 
                }));
            
            console.log("Staff Loaded:", staffData);
            renderStaffList();
            loadSchedule(); // Proceed to schedule once staff are known
        },
        error: (err) => console.error("Staff CSV Load Fail:", err)
    });
}

function loadSchedule() {
    console.log("Fetching Schedule Data...");
    const freshScheduleUrl = SCHEDULE_URL + (SCHEDULE_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();

    Papa.parse(freshScheduleUrl, {
        download: true,
        complete: (results) => {
            const dates = {};
            const data = results.data;
            if (!data || data.length < 1) return;

            // 1. DATE LOGIC: Row 1 (index 0), starting from Column D (index 3)
            const headerRow = data[0] || []; 
            const dateCols = [];
            for (let i = 3; i < headerRow.length; i++) {
                if (headerRow[i] && headerRow[i].trim() !== "") {
                    dateCols.push({ idx: i, date: headerRow[i].trim() });
                }
            }
            
            console.log("Found Date Columns:", dateCols);

            // 2. NAME LOGIC: Column C (index 2), starting from Row 3 (index 2)
            for (let i = 2; i < data.length; i++) {
                const row = data[i];
                // Get name from Column C and clean it
                const rawName = row[2] ? row[2].trim().toLowerCase() : null;

                if (rawName) {
                    // Match against the Staff List loaded in loadStaff()
                    const staffMatch = staffData.find(s => s.name.toLowerCase() === rawName);
                    
                    if (staffMatch) {
                        dateCols.forEach(c => {
                            const shiftValue = row[c.idx];
                            // Filter out "OFF", empty cells, or junk data
                            if (shiftValue && shiftValue.toUpperCase() !== 'OFF' && shiftValue.trim().length > 1) {
                                if (!dates[c.date]) dates[c.date] = { Sala: [], Bar: [] };
                                
                                // Clean time: "18.00 - 02.00" -> "18.00"
                                const startTime = shiftValue.split('-')[0].trim();
                                
                                dates[c.date][staffMatch.area].push({ 
                                    name: staffMatch.name, 
                                    in: startTime 
                                });
                            }
                        });
                    }
                }
            }

            scheduleData = dates;
            updateDateDropdown(Object.keys(dates));
        }
    });
}

function updateDateDropdown(dateKeys) {
    const sel = document.getElementById('dateSelect');
    if (!sel) return;

    if (dateKeys.length > 0) {
        sel.innerHTML = dateKeys.map(d => `<option value="${d}">${d}</option>`).join('');
    } else {
        // Diagnostic message
        sel.innerHTML = '<option>No Matches (Check Names)</option>';
        console.warn("No overlapping matches found between Staff List and Schedule Names.");
    }
}

// --- MANAGE STAFF ---
function renderStaffList() {
    const listDiv = document.getElementById('staffList');
    if (!listDiv) return;

    listDiv.innerHTML = staffData.length ? staffData.map(s => `
        <div class="staff-item" style="display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid #eee; align-items:center;">
            <span><strong>${s.name}</strong> <small style="color:#888; margin-left:10px;">${s.area}</small></span>
            <button onclick="deleteStaff('${s.name}')" style="color:#ff4444; background:none; border:none; font-size:20px; cursor:pointer;">&times;</button>
        </div>
    `).join('') : "No staff found. Add names below.";
}

async function handleAddStaff() {
    const nameInput = document.getElementById('staffName');
    const areaSelect = document.getElementById('staffArea');
    const saveBtn = document.getElementById('saveBtn');
    
    if (!nameInput.value.trim()) return alert("Please enter a name.");
    
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving...";

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'add', name: nameInput.value.trim(), area: areaSelect.value })
        });

        nameInput.value = "";
        setTimeout(loadStaff, 1500); // Reload after Google saves
    } catch (e) {
        alert("Error saving staff.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Save to Google Sheets";
    }
}

async function deleteStaff(name) {
    if(!confirm(`Delete ${name}?`)) return;
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'delete', name: name })
        });
        setTimeout(loadStaff, 1500);
    } catch (e) {
        alert("Error deleting staff.");
    }
}

// --- BRIEFING ---
function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    
    if (!day) return alert("Select a valid date.");

    let text = `*ZENITH BRIEFING - ${date}*\n\n`;
    
    const sortFn = (a, b) => a.in.localeCompare(b.in);

    text += `*BAR:*\n`;
    text += day.Bar.length ? day.Bar.sort(sortFn).map(s => `${s.in} - ${s.name}`).join('\n') : "_No staff_";

    text += `\n\n*SALA:*\n`;
    text += day.Sala.length ? day.Sala.sort(sortFn).map(s => `${s.in} - ${s.name}`).join('\n') : "_No staff_";

    document.getElementById('briefingResult').innerText = text;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

function copyText() {
    const text = document.getElementById('briefingResult').innerText;
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
}

// --- INIT ---
window.onload = () => {
    if (STAFF_URL.includes('PASTE')) {
        alert("Please update your URLs in app.js");
    } else {
        loadStaff();
    }
};
