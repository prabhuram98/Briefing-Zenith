// --- CONFIGURATION --- 
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec'; 
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=0&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=609693221&single=true&output=csv';


let staffData = [];
let scheduleData = {};

// --- NAVIGATION ---
function switchPage(pageId, btn) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // Show selected page
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) targetPage.classList.add('active');

    // Update UI
    btn.classList.add('active');
    const title = document.getElementById('pageTitle');
    if (title) title.innerText = pageId.toUpperCase();
}

// --- DATA LOADING ---
async function loadStaff() {
    console.log("Loading Staff List...");
    // Add timestamp to bypass Google's 5-minute cache
    const freshStaffUrl = STAFF_URL + (STAFF_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();

    Papa.parse(freshStaffUrl, {
        download: true,
        complete: (results) => {
            // Filter out header and empty rows
            staffData = results.data
                .filter(r => r[0] && r[0].toLowerCase() !== "name")
                .map(r => ({ 
                    name: r[0].trim(), 
                    area: r[1] ? r[1].trim() : 'Sala' 
                }));
            
            console.log("Staff Loaded:", staffData);
            renderStaffList();
            loadSchedule(); // Load schedule only after we have the staff list
        },
        error: (err) => console.error("Error loading Staff CSV:", err)
    });
}

function loadSchedule() {
    console.log("Loading Schedule...");
    const freshScheduleUrl = SCHEDULE_URL + (SCHEDULE_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();

    Papa.parse(freshScheduleUrl, {
        download: true,
        complete: (results) => {
            const dates = {};
            // BASED ON YOUR SHEET: Dates are in Row 2 (index 1)
            const headerRow = results.data[1] || []; 
            const dateCols = [];
            
            // Identify columns with dates (looking for "/")
            headerRow.forEach((cell, idx) => {
                if(cell && cell.includes('/')) {
                    dateCols.push({idx, date: cell.trim()});
                }
            });

            // Process each row to find staff members
            results.data.forEach(row => {
                // BASED ON YOUR SHEET: Names are in Column C (index 2)
                const rawName = row[2] ? row[2].trim().toLowerCase() : null;
                
                if (rawName) {
                    // Match with our managed staff list
                    const staffMatch = staffData.find(s => s.name.toLowerCase() === rawName);
                    
                    if (staffMatch) {
                        dateCols.forEach(c => {
                            const shiftInfo = row[c.idx];
                            // Ignore "OFF" or empty cells
                            if (shiftInfo && shiftInfo.toUpperCase() !== 'OFF' && shiftInfo.length > 1) {
                                if (!dates[c.date]) dates[c.date] = { Sala: [], Bar: [] };
                                
                                // Clean the time (e.g., "18.00 - 02.00" -> "18.00")
                                const startTime = shiftInfo.split('-')[0].trim();
                                
                                dates[c.date][staffMatch.area].push({ 
                                    name: staffMatch.name, 
                                    in: startTime 
                                });
                            }
                        });
                    }
                }
            });

            scheduleData = dates;
            updateDateDropdown(Object.keys(dates));
        },
        error: (err) => console.error("Error loading Schedule CSV:", err)
    });
}

function updateDateDropdown(dateKeys) {
    const sel = document.getElementById('dateSelect');
    if (!sel) return;

    if (dateKeys.length > 0) {
        sel.innerHTML = dateKeys.map(d => `<option value="${d}">${d}</option>`).join('');
    } else {
        sel.innerHTML = '<option>No Staff Matches Found</option>';
        console.warn("No dates found. Ensure names in Schedule match the Manage tab exactly.");
    }
}

// --- MANAGE STAFF ACTIONS ---
function renderStaffList() {
    const listDiv = document.getElementById('staffList');
    if (!listDiv) return;

    listDiv.innerHTML = staffData.length ? staffData.map(s => `
        <div class="staff-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; align-items:center;">
            <span><strong>${s.name}</strong> <small style="color:#666">(${s.area})</small></span>
            <button onclick="deleteStaff('${s.name}')" style="color:red; background:none; border:none; font-size:18px; cursor:pointer;">✕</button>
        </div>
    `).join('') : "Your staff list is empty. Add someone above!";
}

async function handleAddStaff() {
    const nameInput = document.getElementById('staffName');
    const areaSelect = document.getElementById('staffArea');
    const saveBtn = document.getElementById('saveBtn');
    
    const name = nameInput.value.trim();
    if (!name) return alert("Please enter a name.");
    
    saveBtn.disabled = true;
    saveBtn.innerText = "Connecting...";

    try {
        // Send to Google Apps Script
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'add', name: name, area: areaSelect.value })
        });

        alert("Added to Google Sheets!");
        nameInput.value = "";
        // Refresh local data after short delay
        setTimeout(loadStaff, 1500);
    } catch (e) {
        console.error(e);
        alert("Failed to save. Check your SCRIPT_URL.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Save to Google Sheets";
    }
}

async function deleteStaff(name) {
    if(!confirm(`Are you sure you want to remove ${name}?`)) return;
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'delete', name: name })
        });
        setTimeout(loadStaff, 1500);
    } catch (e) {
        alert("Delete failed.");
    }
}

// --- BRIEFING GENERATION ---
function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayData = scheduleData[selectedDate];
    
    if (!dayData) return alert("Select a valid date first.");

    let output = `*ZENITH BRIEFING - ${selectedDate}*\n\n`;
    
    output += `*BAR:*\n`;
    if (dayData.Bar.length > 0) {
        output += dayData.Bar.sort((a,b) => a.in.localeCompare(b.in))
                  .map(s => `${s.in} - ${s.name}`).join('\n');
    } else { output += "_No staff assigned_"; }

    output += `\n\n*SALA:*\n`;
    if (dayData.Sala.length > 0) {
        output += dayData.Sala.sort((a,b) => a.in.localeCompare(b.in))
                  .map(s => `${s.in} - ${s.name}`).join('\n');
    } else { output += "_No staff assigned_"; }

    document.getElementById('briefingResult').innerText = output;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

function copyText() {
    const briefingText = document.getElementById('briefingResult').innerText;
    navigator.clipboard.writeText(briefingText).then(() => {
        alert("Briefing copied to clipboard!");
    });
}

// --- INITIALIZE ---
window.onload = () => {
    // Basic check to see if URLs are actually changed
    if (SCRIPT_URL.startsWith('PASTE')) {
        console.error("Setup Incomplete: You must paste your URLs at the top of app.js");
        document.getElementById('staffList').innerText = "Configuration Error: Check app.js URLs";
    } else {
        loadStaff();
    }
};
