// ... existing loadData logic ...

window.addStaff = function() {
    const name = document.getElementById('newStaffName').value.trim();
    const alias = document.getElementById('newStaffAlias').value.trim();
    const area = document.getElementById('newStaffArea').value;

    if(!name || !alias) return alert("Fill all fields");

    // Local Update
    staffMap[name.toLowerCase()] = { alias: alias, area: area, position: 'Staff' };
    
    // Note: To save permanently to Google Sheets, you would need a 
    // Google Apps Script Web App URL. For now, it updates the session.
    renderStaffList();
    alert("Staff member added locally. To sync with Sheet, ensure your Web App URL is connected.");
};

window.deleteStaff = function(name) {
    if(confirm(`Remove ${name} from directory?`)) {
        delete staffMap[name.toLowerCase()];
        renderStaffList();
    }
};

function renderStaffList() {
    const container = document.getElementById('staffListContainer');
    container.innerHTML = `<span class="section-label">Active Staff Members</span>` + 
    Object.keys(staffMap).map(key => {
        const s = staffMap[key];
        return `
            <div class="form-field">
                <div><div class="form-label">${s.area}</div><div class="form-value">${s.alias}</div></div>
                <button class="btn-delete" onclick="window.deleteStaff('${key}')">Remove</button>
            </div>`;
    }).join('');
}
