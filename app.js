let appData = {};

function roundTime(timeStr) {
    return timeStr.replace('.', ':');
}

// --- CSV PARSING LOGIC ---
document.getElementById('csvUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        skipEmptyLines: true,
        complete: function(results) {
            parseZenithFormat(results.data);
        }
    });
});

function parseZenithFormat(rows) {
    const newData = {};
    const monthMap = { 
        'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'ABRIL': '04', 'MAIO': '05', 'JUNHO': '06',
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06'
    };
    
    const titleRow = rows[1] || [];
    const year = titleRow[0]?.split(' ')[1] || new Date().getFullYear();
    const headerRow = rows[2] || [];
    const colToDateMap = [];

    for (let j = 3; j < headerRow.length; j++) {
        const cell = headerRow[j];
        if (cell && cell.includes('/')) {
            const [day, mShort] = cell.split('/');
            const formattedDate = `${day.padStart(2, '0')}/${monthMap[mShort] || '01'}/${year}`;
            colToDateMap.push({ colIndex: j, dateStr: formattedDate });
        }
    }

    rows.forEach(row => {
        // Only rows marked H/W contain the shift schedules
        if (row[1] === 'H/W' && row[2]) {
            const name = row[2].trim();
            // Assign area (logic assumes row 0 grouping or name-based later)
            const area = row[0] === '1' ? 'Sala' : 'Bar'; 

            colToDateMap.forEach(item => {
                const shiftValue = row[item.colIndex];
                const times = shiftValue?.match(/(\d{1,2}[:.]\d{2})[-: ]+(\d{1,2}[:.]\d{2})/);
                
                if (times) {
                    if (!newData[item.dateStr]) newData[item.dateStr] = [];
                    newData[item.dateStr].push({
                        name: name,
                        area: area,
                        entry: times[1].replace('.', ':'),
                        exit: times[2].replace('.', ':')
                    });
                }
            });
        }
    });

    appData = newData;
    populateDateDropdown();
    alert("Schedule loaded successfully!");
}

function populateDateDropdown() {
    const select = document.getElementById('dateSelect');
    select.innerHTML = '';
    const dates = Object.keys(appData).sort();
    dates.forEach(date => {
        const opt = document.createElement('option');
        opt.value = date;
        opt.textContent = date;
        select.appendChild(opt);
    });
}

// --- ORIGINAL BRIEFING GENERATION LOGIC ---
document.getElementById('generateBtn').addEventListener('click', () => {
    const date = document.getElementById('dateSelect').value;
    if (!appData[date]) return;

    const dayData = appData[date];
    const sala = dayData.filter(s => s.area === 'Sala');
    const bar = dayData.filter(s => s.area === 'Bar');

    // 1. PORTA
    let portaStaff = sala.find(s => s.name.toLowerCase() === 'ana') || 
                     sala.reduce((earliest, s) => !earliest || s.entry < earliest.entry ? s : earliest, null);

    // 2. BAR
    const barSorted = [...bar].sort((a,b) => a.entry.localeCompare(b.entry));
    let barLines = [];
    if (barSorted.length > 0) {
        barLines.push(`${roundTime(barSorted[0].entry)} Abertura Sala/Bar: ${barSorted[0].name}`);
        barSorted.forEach((s, i) => {
            barLines.push(`${roundTime(s.entry)} Bar ${String.fromCharCode(65 + i)}: ${s.name}`);
        });
    }

    // 3. SELLERS & RUNNER (Julieta Logic)
    let salaExclAna = sala.filter(s => s !== portaStaff);
    const julieta = salaExclAna.find(s => s.name.toLowerCase() === 'julieta');
    const otherSala = salaExclAna.filter(s => s.name.toLowerCase() !== 'julieta');

    let sellers = [];
    let runnerLine = '';
    if (salaExclAna.length >= 3 && julieta) {
        sellers = otherSala.sort((a,b) => a.entry.localeCompare(b.entry));
        runnerLine = `Runner A e B: Julieta`;
    } else {
        sellers = salaExclAna.sort((a,b) => a.entry.localeCompare(b.entry));
        runnerLine = `Runner A e B: Todos`;
    }
    const sellerLines = sellers.map((s, idx) => `${roundTime(s.entry)} Seller ${String.fromCharCode(65+idx)}: ${s.name}`);

    // 4. HACCP & FECHO
    const barHACCP = [...bar].sort((a,b) => a.exit.localeCompare(b.exit));
    let haccpLines = [];
    if (barHACCP[0]) haccpLines.push(`${roundTime(barHACCP[0].exit)} Preparações Bar: ${barHACCP[0].name}`);
    
    const fechoPriority = ['carlos','prabhu','ana'];
    let fechoPerson = fechoPriority.find(p => bar.some(b => b.name.toLowerCase() === p)) || (barSorted[barSorted.length-1]?.name || "Staff");

    // 5. COMPOSE FINAL TEXT
    let briefing = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
    briefing += `${roundTime(portaStaff.entry)} Porta: ${portaStaff.name}\n\n`;
    briefing += `BAR:\n${barLines.join('\n')}\n\n⸻⸻⸻⸻\n\n`;
    briefing += `‼️ Loiça é responsabilidade de todos.\n——————————————\n\n`;
    briefing += `SELLERS:\n${sellerLines.join('\n')}\n${runnerLine}\n\n`;
    briefing += `HACCP:\n${haccpLines.join('\n')}\n\n`;
    briefing += `${barSorted[barSorted.length-1]?.exit || ''} Fecho de Caixa: ${fechoPerson}\n\n`;
    briefing += `Bom serviço a todos!`;

    document.getElementById('briefingText').textContent = briefing;
    document.getElementById('briefingPopup').style.display = 'flex';
});

// UI Controls
document.getElementById('closeBtn').onclick = () => document.getElementById('briefingPopup').style.display = 'none';
document.getElementById('copyBtn').onclick = () => {
    navigator.clipboard.writeText(document.getElementById('briefingText').textContent);
    alert("Copied!");
};
