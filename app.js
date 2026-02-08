let appData = {};

// --- 1. CSV PARSER LOGIC ---
document.getElementById('csvUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        skipEmptyLines: true,
        complete: function(results) {
            parseZenithCSV(results.data);
            document.getElementById('dateSection').style.display = 'block';
        }
    });
});

function parseZenithCSV(rows) {
    const newData = {};
    const headerRow = rows[2] || [];
    const year = rows[1]?.[0]?.split(' ')[1] || new Date().getFullYear();
    const monthMap = { 
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03'
    };

    const colMap = [];
    for (let j = 3; j < headerRow.length; j++) {
        if (headerRow[j] && headerRow[j].includes('/')) {
            const [d, m] = headerRow[j].split('/');
            colMap.push({ col: j, date: `${d.padStart(2,'0')}/${monthMap[m] || '01'}/${year}` });
        }
    }

    rows.forEach(row => {
        if (row[1] === 'H/W' && row[2]) {
            const name = row[2].trim();
            const area = row[0] === '1' ? 'Sala' : 'Bar';
            colMap.forEach(item => {
                const shift = row[item.col];
                const times = shift?.match(/(\d{1,2}[:.]\d{2})[-: ]+(\d{1,2}[:.]\d{2})/);
                if (times) {
                    if (!newData[item.date]) newData[item.date] = { sala: [], bar: [] };
                    const entry = times[1].replace('.', ':');
                    const exit = times[2].replace('.', ':');
                    const staffObj = { name, entry, exit };
                    if (area === 'Sala') newData[item.date].sala.push(staffObj);
                    else newData[item.date].bar.push(staffObj);
                }
            });
        }
    });

    appData = newData;
    const sel = document.getElementById('dateSelect');
    sel.innerHTML = Object.keys(appData).sort().map(d => `<option value="${d}">${d}</option>`).join('');
    alert("Schedule loaded successfully!");
}

// --- 2. GENERATOR LOGIC ---
document.getElementById('generateBtn').addEventListener('click', () => {
    const date = document.getElementById('dateSelect').value;
    const dayData = appData[date];
    if (!dayData) return;

    const { sala, bar } = dayData;

    // PORTA Logic
    let porta = sala.find(s => s.name.toLowerCase() === 'ana') || 
                sala.reduce((a, b) => a.entry < b.entry ? a : b, sala[0]);

    // BAR Logic
    const barSorted = [...bar].sort((a,b) => a.entry.localeCompare(b.entry));
    const bA = barSorted[0] || {name: "Staff", entry: "--:--"};
    const bB = barSorted[1] || {name: "Staff", entry: "--:--"};
    const bC = barSorted[2] || {name: "Staff", entry: "--:--"};
    const bD = barSorted[3] || {name: "Staff", entry: "--:--"};

    // SELLERS & RUNNER
    let sExclPorta = sala.filter(s => s.name !== porta.name);
    const jul = sExclPorta.find(s => s.name.toLowerCase() === 'julieta');
    let runners = (sExclPorta.length >= 3 && jul) ? "Julieta" : "Todos";
    let sellers = sExclPorta.filter(s => s.name.toLowerCase() !== 'julieta').sort((a,b) => a.entry.localeCompare(b.entry));

    // HACCP BAR (Sorted by EXIT)
    const bExit = [...bar].sort((a,b) => a.exit.localeCompare(b.exit));
    const bLast = bExit[bExit.length - 1] || {name: "Staff", exit: "--:--"};

    // HACCP SALA (Sorted by EXIT)
    const sExit = [...sala].sort((a,b) => a.exit.localeCompare(b.exit));
    const s1 = sExit[0] || {name: "Staff", exit: "--:--"};
    const s2 = sExit[1] || {name: "Staff", exit: "--:--"};
    const s3 = sExit[2] || {name: "Staff", exit: "--:--"};
    const s4 = sExit[3] || s1;
    const sLast = sExit[sExit.length - 1] || {name: "Staff", exit: "--:--"};

    // FECHO DE CAIXA
    const fp = ['carlos','prabhu','ana'];
    let fName = fp.find(p => bar.some(b => b.name.toLowerCase() === p)) || bLast.name;

    // --- 3. TEMPLATE CONSTRUCTION ---
    let b = `BRIEFING ( ${date} )\n \n`;
    b += `${porta.entry} Porta: ${porta.name}\n\n`;
    
    b += `BAR: \n`;
    b += `${bA.entry} Abertura Sala/Bar: ${bA.name}\n`;
    b += `${bA.entry} Bar A: ${bA.name} * Barista - Caixa/Bebidas\n`;
    b += `${bB.entry} Bar B: ${bB.name} Barista - Bebidas /Smoothies\n`;
    b += `${bC.entry} Bar C: ${bC.name} Barista - Bebidas /Smoothies\n`;
    b += `${bD.entry} Bar D: ${bD.name} Barista- Cafés\n\n`;

    b += `________\n‼️ Loiça é responsabilidade de todos.\n—————————————— \n\n`;
    
    b += `SELLERS:\n`;
    if(sellers[0]) b += `${sellers[0].entry} Seller A: ${sellers[0].name}  Seller\n`;
    if(sellers[1]) b += `${sellers[1].entry} Seller B: ${sellers[1].name}  Seller\n\n`;

    b += `⚠Pastéis de Nata - Cada Seller na sua secção⚠\n`;
    b += `——————————————\n`;
    b += `Seller A: Mesa 20-30\n`;
    b += `Seller B: Mesa 1-12\n`;
    b += `Seller C: Sala de cima \n`;
    b += `——————————————\n`;
    b += `RUNNERS:\n`;
    b += `${sellers[0]?.entry || porta.entry} Runner A e B: ${runners}\n`;
    b += `——————————————\n\n`;

    b += `‼️Loiça é responsabilidade de todos!\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\n`;

    b += `HACCP/LIMPEZA BAR:\n`;
    b += `${bExit[0]?.exit || ''} Preparações Bar: ${bExit[0]?.name || ''}\n`;
    b += `${bExit[1]?.exit || ''} Reposição Bar: ${bExit[1]?.name || ''}\n`;
    b += `${bLast.exit} Limpeza Máquina de Café/Reposição de Leites: ${bLast.name}\n`;
    b += `${bLast.exit} Fecho Bar: ${bLast.name}\n\n\n`;

    b += `HACCP/ SALA:\n`;
    b += `${s1.exit} Limpeza da sala de cima: ${s1.name}\n`;
    b += `${s2.exit} Limpeza e reposição aparador/cadeira de bebés: ${s2.name}\n`;
    b += `${s3.exit} Repor papel (casa de banho): ${s3.name}\n`;
    b += `17:30 Limpeza de Espelhos e vidros: ${s4.name}\n`;
    b += `${sLast.exit} Limpeza da casa de banho (clientes e staff): ${sLast.name}\n`;
    b += `${sLast.exit} Fecho da sala: ${sLast.name}\n`;
    b += `${bLast.exit} Fecho de Caixa: ${fName}`;

    document.getElementById('briefingText').textContent = b;
    document.getElementById('briefingPopup').style.display = 'flex';
});

// UI Controls
document.getElementById('closeBtn').onclick = () => document.getElementById('briefingPopup').style.display = 'none';
document.getElementById('copyBtn').onclick = () => {
    navigator.clipboard.writeText(document.getElementById('briefingText').textContent);
    alert("Briefing copied to clipboard!");
};
