// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzeVunNwX1r-TqWXEgXu-igrPqxd6OvW7ibRg9uoNRSSFr2aD_OieZPjTty6aR88gCPIA/exec';
const SCHEDULE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=0&single=true&output=csv';
const STAFF_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRabV2A5AGC6wm3FQPUi7Uy49QYlVpgMaFNUeGcFszNSGIx0sjts8_hsTKP1xOjR8Y-mTH4nBWDXb7b/pub?gid=609693221&single=true&output=csv';

let staffData = [];
let scheduleData = {};

// --- NAVIGATION ---
function switchPage(pageId, btn) {
    const pageTitle = document.getElementById('pageTitle');
    const briefingPage = document.getElementById('briefingPage');
    const managePage = document.getElementById('managePage');

    // Remove active classes
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // Show selected page
    if (pageId === 'briefing') {
        briefingPage.classList.add('active');
    } else {
        managePage.classList.add('active');
    }

    // Update UI
    btn.classList.add('active');
    if (pageTitle) pageTitle.innerText = pageId.toUpperCase();
}

// --- DATA LOADING ---
async function loadStaff() {
    Papa.parse(STAFF_URL, {
        download: true,
        complete: (results) => {
            staffData = results.data
                .filter(r => r[0] && r[0].toLowerCase() !== "name")
                .map(r => ({ name: r[0].trim(), area: r[1] || 'Sala' }));
            renderStaffList();
            loadSchedule();
        },
        error: (err) => console.error("Staff CSV Error:", err)
    });
}

function loadSchedule() {
    Papa.parse(SCHEDULE_URL, {
        download: true,
        complete: (results) => {
            const dates = {};
            const header = results.data[0] || []; 
            const dateCols = [];
            
            header.forEach((cell, idx) => {
                if(cell && cell.includes('/')) dateCols.push({idx, date: cell});
            });

            results.data.forEach(row => {
                const name = row[2] ? row[2].trim().toLowerCase() : null;
                const staff = staffData.find(s => s.name.toLowerCase() === name);
                if (staff) {
                    dateCols.forEach(c => {
                        const timeMatch = row[c.idx]?.match(/(\d{1,2}[:.]\d{2})/g);
                        if (timeMatch) {
                            if (!dates[c.date]) dates[c.date] = { Sala: [], Bar: [] };
                            dates[c.date][staff.area].push({ name: staff.name, in: timeMatch[0] });
                        }
                    });
                }
            });
            scheduleData = dates;
            const sel = document.getElementById('dateSelect');
            if (sel) {
                sel.innerHTML = Object.keys(dates).map(d => `<option value="${d}">${d}</option>`).join('') || '<option>No dates</option>';
            }
        }
    });
}

// --- ACTIONS ---
function renderStaffList() {
    const list = document.getElementById('staffList');
    if (!list) return; // Safety check for the 'null' error

    list.innerHTML = staffData.length ? staffData.map(s => `
        <div class="staff-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>${s.name} (${s.area})</span>
            <button onclick="deleteStaff('${s.name}')" style="color:red; background:none; border:none; cursor:pointer;">✕</button>
        </div>
    `).join('') : "No staff in list.";
}

async function handleAddStaff() {
    const nameInput = document.getElementById('staffName');
    const area = document.getElementById('staffArea').value;
    const btn = document.getElementById('saveBtn');
    
    if (!nameInput.value.trim()) return alert("Enter Name");
    
    btn.disabled = true;
    btn.innerText = "Saving...";

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'add', name: nameInput.value.trim(), area: area })
        });
        nameInput.value = "";
        setTimeout(loadStaff, 2000);
    } catch (e) {
        alert("Error connecting.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Save to Google Sheets";
    }
}

async function deleteStaff(name) {
    if(!confirm("Delete " + name + "?")) return;
    await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'delete', name: name })
    });
    setTimeout(loadStaff, 2000);
}

function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const day = scheduleData[date];
    if (!day) return alert("No schedule data.");

    let text = `*ZENITH BRIEFING - ${date}*\n\n`;
    text += `*BAR:*\n` + (day.Bar.length ? day.Bar.sort((a,b)=>a.in.localeCompare(b.in)).map(s=>`${s.in} - ${s.name}`).join('\n') : "None");
    text += `\n\n*SALA:*\n` + (day.Sala.length ? day.Sala.sort((a,b)=>a.in.localeCompare(b.in)).map(s=>`${s.in} - ${s.name}`).join('\n') : "None");

    document.getElementById('briefingResult').innerText = text;
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }
function copyText() {
    const text = document.getElementById('briefingResult').innerText;
    navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}

// Initial Run
window.onload = loadStaff;
