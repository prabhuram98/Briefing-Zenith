window.generateBriefing = function() {
    const selectedDate = document.getElementById('dateSelect').value;
    
    // 1. Data Integrity Check (Mirroring Staff View logic)
    if (!window.scheduleData || !window.scheduleData[selectedDate]) {
        return alert("No data found for the selected date. Please wait for the sync to complete.");
    }

    const dayStaff = window.scheduleData[selectedDate];

    // 2. Filter Active Staff (Only those with valid times, no OFF/Folga)
    const activeStaff = dayStaff.filter(s => s.shiftRaw && /\d/.test(s.shiftRaw));

    if (activeStaff.length === 0) {
        return alert("No staff assigned with times for this day.");
    }

    // 3. Helper Functions for Time Parsing
    const getEntry = (s) => s.shiftRaw.split('-')[0].trim();
    const getExit = (s) => s.shiftRaw.split('-')[1].trim();
    const parseToMin = (t) => { 
        const p = t.split(':'); 
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); 
    };

    // 4. Sort Staff by Entry and Exit Times
    const byEntry = [...activeStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...activeStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    // 5. Categorize by Area (As per your saved instructions)
    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar');
    const salaEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala');
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala');

    // 6. Assignment Logic
    const findStaff = (list, pos) => list.find(s => s.position.toLowerCase().includes(pos.toLowerCase()));

    // Porta: Manager, Head Seller, or first Sala entry
    let porta = findStaff(activeStaff, 'Manager') || findStaff(activeStaff, 'Head Seller') || salaEntry[0];
    
    // Sellers: Sala staff excluding managers
    const sellers = salaEntry.filter(s => !s.position.toLowerCase().includes('manager') || salaEntry.length === 1);
    
    // Fecho de Caixa: Highest rank exiting last
    const fechoCaixa = findStaff(activeStaff, 'Head Seller') || findStaff(activeStaff, 'Bar Manager') || findStaff(activeStaff, 'Manager') || salaExit[salaExit.length - 1];

    // 7. Template Generation
    let b = `Bom dia a todos!\n\n*BRIEFING ${selectedDate.split('/')[0]}/${selectedDate.split('/')[1]}*\n\n`;
    b += `${getEntry(porta)} Porta: ${porta.alias}\n\nBAR:\n`;
    
    if (barEntry[0]) {
        b += `${getEntry(barEntry[0])} Abertura Sala/Bar: *${barEntry[0].alias}*\n`;
        b += `${getEntry(barEntry[0])} Bar A: *${barEntry[0].alias}* Barista – Bebidas\n`;
    }
    if (barEntry[1]) b += `${getEntry(barEntry[1])} Bar B: *${barEntry[1].alias}* Barista – Cafés / Caixa\n`;
    if (barEntry[2]) b += `${getEntry(barEntry[2])} Bar C: *${barEntry[2].alias}*\n`;
    if (barEntry[3]) b += `${getEntry(barEntry[3])} Bar D: *${barEntry[3].alias}*\n`;

    b += `\n⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\nSELLERS:\n`;
    if (sellers[0]) b += `${getEntry(sellers[0])} Seller A: *${sellers[0].alias}*\n`;
    if (sellers[1]) b += `${getEntry(sellers[1])} Seller B: *${sellers[1].alias}*\n`;
    if (sellers[2]) b += `${getEntry(sellers[2])} Seller C: *${sellers[2].alias}*\n`;

    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\n`;
    if (sellers[0]) b += `Seller A: Mesas 20-30\n`;
    if (sellers[1]) b += `Seller B & C: Mesas 1-12\n`;
    if (sellers[2]) b += `Seller C: Mesas 40-57\n`;
    b += `——————————————\n\n`;

    // Runners
    const runnerStaff = activeStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const runnerTxt = runnerStaff.length > 0 ? runnerStaff.map(r => r.alias).join(' e ') : "Todos";
    const runnerTime = runnerStaff.length > 0 ? getEntry(runnerStaff[0]) : (salaEntry[0] ? getEntry(salaEntry[0]) : "08:00");
    b += `RUNNERS:\n${runnerTime} Runner A e B: ${runnerTxt}\n——————————————\n\n`;

    // HACCP BAR
    const bE1 = barExit[0], bE2 = barExit[1], bL = barExit[barExit.length - 1];
    b += `HACCP / LIMPEZA BAR:\n`;
    if (bE1) b += `${getExit(bE1)} Preparações Bar: *${bE1.alias}*\n`;
    if (bE2) b += `${getExit(bE2)} Reposição Bar: *${bE2.alias}*\n`;
    else if (bL) b += `${getExit(bL)} Limpeza Máquina/Leites: *${bL.alias}*\n`;
    if (bL) b += `${getExit(bL)} Fecho Bar: *${bL.alias}*\n\n`;

    // HACCP SALA
    const sE1 = salaExit[0], sE2 = salaExit[1] || sE1, sE3 = salaExit[2], sL = salaExit[salaExit.length - 1];
    const wcS = barExit[1] ? barExit[1].alias : (sE3 ? sE3.alias : sL.alias);
    b += `HACCP / SALA:\n`;
    if (sE1) b += `${getExit(sE1)} Fecho do sala de cima: *${sE1.alias}*\n`;
    if (sE1) b += `${getExit(sE1)} Limpeza e reposição aparador/cadeiras: *${sE1.alias}*\n`;
    if (sE2) b += `${getExit(sE2)} Repor papel WC: *${sE2.alias}*\n`;
    b += `${getExit(sE2)} Limpeza WC: *${wcS}*\n`;
    b += `${getExit(sL)} Limpeza espelhos e vidros: *${sE3 ? sE3.alias : sL.alias}*\n`;
    if (sL) b += `Fecho da sala: *${sL.alias}*\n`;
    b += `${getExit(fechoCaixa)} Fecho de Caixa: *${fechoCaixa.alias}*`;

    // 8. Output to Modal
    document.getElementById('briefingTextContainer').innerText = b;
    document.getElementById('briefingModal').style.display = 'flex';
};

window.copyBriefingText = function() {
    const text = document.getElementById('briefingTextContainer').innerText;
    navigator.clipboard.writeText(text).then(() => alert("✅ Briefing Copied!"));
};

window.closeBriefingModal = function() { 
    document.getElementById('briefingModal').style.display = 'none'; 
};
