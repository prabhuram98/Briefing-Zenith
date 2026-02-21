// ... (Keep URLs and loadData/loadSchedule logic exactly as before) ...

// --- UPGRADED ADVANCED TABLE VIEW ---
function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date] || [];
    
    // Group staff by Area
    const activeAreas = [...new Set(day.map(s => s.area))].sort();
    
    document.getElementById('scheduleTableWrapper').innerHTML = activeAreas.map(area => `
        <div class="area-divider">${area}</div>
        ${day.filter(s => s.area === area).map(s => `
            <div class="staff-row">
                <div class="staff-info">
                    <div style="font-weight:800; font-size:16px;">${s.alias}</div>
                    <div style="font-size:12px; color:#8e8e93; font-weight:600;">${s.position}</div>
                </div>
                <div class="staff-time" style="background:#f2f2f7; padding:8px 12px; border-radius:10px; font-weight:800; font-size:14px;">
                    ${s.shiftRaw}
                </div>
            </div>`).join('')}
    `).join('');
}

// --- EASY CRUD DIRECTORY RENDERING ---
function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    const sorted = Object.keys(staffMap).sort();
    
    container.innerHTML = `
        <div style="padding:0 15px 15px 15px;">
            <p style="font-size:12px; font-weight:700; color:#8e8e93; text-transform:uppercase;">${sorted.length} Staff Members</p>
        </div>
        ${sorted.map(k => `
        <div class="staff-edit-card" onclick="openStaffForm('${k}')">
            <div>
                <div style="font-weight:800; font-size:16px;">${staffMap[k].alias}</div>
                <div style="font-size:12px; color:#8e8e93; font-weight:600;">${staffMap[k].area} • ${staffMap[k].position}</div>
            </div>
            <div style="color:#dbc9b7; font-size:20px;">➔</div>
        </div>`).join('')}`;
}

// ... (Keep confirmSave/confirmDelete as before, they will now look modern because of CSS) ...
