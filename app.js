/** Zenith v1.8 - Data Management **/
const URL_DATA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=65389581&single=true&output=csv';
const URL_STAFF = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHJ_JT_klhojgLxfsWe00P1_cQ57sQrObsfirrf07bUZkpUaj5EEaRx-gOzlhcWkuXXA4LkQMFpYSC/pub?gid=1462047861&single=true&output=csv';

window.zenithData = {
    schedule: {},
    staff: {}
};

function openPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id === 'staffPage') renderStaff();
}

async function init() {
    // 1. Load Staff Directory
    Papa.parse(URL_STAFF, {
        download: true,
        header: true,
        complete: (res) => {
            res.data.forEach(row => {
                if(row.Name) {
                    window.zenithData.staff[row.Name.toLowerCase().trim()] = {
                        alias: row.Alias || row.Name,
                        area: row.Area || 'Sala',
                        pos: row.Position || 'Staff'
                    };
                }
            });
            loadSchedule();
        }
    });
}

function loadSchedule() {
    Papa.parse(URL_DATA, {
        download: true,
        header: true,
        complete: (res) => {
            const days = Object.keys(res.data[0]).filter(k => k !== 'Name' && !k.includes('Total'));
            days.forEach(day => {
                window.zenithData.schedule[day] = res.data.map(row => ({
                    id: row.Name ? row.Name.toLowerCase().trim() : '',
                    shift: row[day]
                })).filter(s => s.shift && /\d/.test(s.shift));
            });
            
            const dropdowns = ['briefingDate', 'viewDate'];
            const opts = days.map(d => `<option value="${d}">${d}</option>`).join('');
            dropdowns.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = opts; });
        }
    });
}

function renderStaff() {
    const list = document.getElementById('staffList');
    list.innerHTML = Object.values(window.zenithData.staff).sort((a,b) => a.alias.localeCompare(b.alias)).map(s => `
        <div class="form-field">
            <div><span class="form-label">${s.pos}</span><span class="form-value">${s.alias}</span></div>
            <span style="font-weight:bold; color:#8d6e63;">${s.area}</span>
        </div>
    `).join('');
}

function renderDayView() {
    const date = document.getElementById('viewDate').value;
    const workers = window.zenithData.schedule[date] || [];
    document.getElementById('dayList').innerHTML = workers.map(w => {
        const info = window.zenithData.staff[w.id] || { alias: w.id, area: 'N/A' };
        return `
            <div class="form-field">
                <div><span class="form-label">${info.area}</span><span class="form-value">${info.alias}</span></div>
                <span class="form-value">${w.shift}</span>
            </div>
        `;
    }).join('');
}

window.onload = init;
