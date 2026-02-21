/* Logic preserved exactly as requested - Visual rendering updated for iOS 26 style */

async function loadData() {
    return new Promise((resolve) => {
        Papa.parse(`${STAFF_URL}&t=${new Date().getTime()}`, {
            download: true,
            complete: (results) => {
                staffMap = {};
                let posSet = new Set();
                results.data.forEach((row, i) => {
                    if (i === 0 || !row[0]) return;
                    const name = row[0].toLowerCase().trim();
                    staffMap[name] = { alias: row[3] || row[0], area: row[1] || 'Sala', position: row[2] || 'Staff' };
                    posSet.add(row[2] || 'Staff');
                });
                // Dynamic position dropdown update
                const posDropdown = document.getElementById('formPosition');
                if(posDropdown) {
                    posDropdown.innerHTML = Array.from(posSet).sort().map(p => `<option value="${p}">${p}</option>`).join('');
                }
                
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

function showStaffTable() {
    const date = document.getElementById('manageDateSelect').value;
    const day = scheduleData[date] || [];
    const activeAreas = [...new Set(day.map(s => s.area))].sort();
    
    // Advanced iOS 26.3 View Rendering
    document.getElementById('scheduleTableWrapper').innerHTML = activeAreas.map(area => `
        <div class="area-divider">${area}</div>
        ${day.filter(s => s.area === area).map(s => `
            <div class="staff-row">
                <div>
                    <div style="font-weight:900; font-size:18px; letter-spacing:-0.5px;">${s.alias}</div>
                    <div style="font-size:13px; color:#a1a1a6; font-weight:700; margin-top:2px;">${s.position}</div>
                </div>
                <div class="staff-time">${s.shiftRaw}</div>
            </div>`).join('')}
    `).join('');
}

function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    const sorted = Object.keys(staffMap).sort();
    // CRUD Directory Rendering
    container.innerHTML = `
        <div style="padding: 20px 25px 10px;">
            <span style="font-weight:900; font-size:24px;">Directory</span>
        </div>
        ${sorted.map(k => `
        <div class="staff-edit-card" onclick="openStaffForm('${k}')">
            <div style="background: white; margin: 5px 20px; padding: 22px; border-radius: 28px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                <div>
                    <div style="font-weight:900; font-size:18px;">${staffMap[k].alias}</div>
                    <div style="font-size:13px; color:#a1a1a6; font-weight:700;">${staffMap[k].area} • ${staffMap[k].position}</div>
                </div>
                <div style="background: #efeff4; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; color: var(--zenith-coffee); font-weight:bold;">→</div>
            </div>
        </div>`).join('')}`;
}
