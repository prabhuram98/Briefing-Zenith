window.generateBriefing = function() {
    // 1. Get the date currently selected in the dropdown
    const selectedDate = document.getElementById('dateSelect').value;
    
    // 2. Access the data exactly as the Daily View does
    if (!window.scheduleData || !window.scheduleData[selectedDate]) {
        return alert("Data not found. Please ensure the schedule is loaded.");
    }

    const dayStaff = window.scheduleData[selectedDate];

    // 3. Filter for active shifts (those with time ranges)
    const activeStaff = dayStaff.filter(s => s.shiftRaw && /\d/.test(s.shiftRaw));
    if (activeStaff.length === 0) return alert("No active shifts found for this day.");

    // 4. Utility helpers for time-based logic
    const getEntry = (s) => s.shiftRaw.split('-')[0].trim();
    const getExit = (s) => s.shiftRaw.split('-')[1].trim();
    const parseToMin = (t) => { 
        const p = t.split(':'); 
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); 
    };

    // 5. Sort by Entry (Arrival) and Exit (Departure)
    const byEntry = [...activeStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...activeStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    // 6. Split by Area (Business Rule: Bar tasks for Bar staff, Sala for Sala)
    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar');
    const salaEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala');
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala');

    // 7. Role Assignment Logic
    const findStaff = (list, pos) => list.find(s => s.position.toLowerCase().includes(pos.toLowerCase()));

    // Porta: Prioritize Manager/Head Seller, else first Sala staff to arrive
    let porta = findStaff(activeStaff, 'Manager') || findStaff(activeStaff, 'Head Seller') || salaEntry[0];
    
    // Sellers: Sala staff who aren't primary managers
    const sellers = salaEntry.filter(s => !s.position.toLowerCase().includes('manager') || salaEntry.length === 1);
    
    // Fecho de Caixa: Highest rank leaving latest
    const fechoCaixa = findStaff(activeStaff, 'Head Seller') || findStaff(activeStaff, 'Bar Manager') || findStaff(activeStaff, 'Manager') || salaExit[salaExit.length - 1];

    // 8. Generate the Text Template
    let b = `Bom dia a todos!\n\n*BRIEFING ${selectedDate}*\n\n`;
    b += `${getEntry(porta)} Porta: ${porta.alias}\n\nBAR:\n`;
    
    if (barEntry[0]) {
        b += `${getEntry(barEntry[0])} Abertura Sala/Bar: *${barEntry[0].alias}*\n`;
        b += `${getEntry(barEntry[0])} Bar A: *${barEntry[0].alias}* Barista – Bebidas\n`;
    }
    if (barEntry[1]) b += `${getEntry(barEntry[1])} Bar B: *${barEntry[1].alias}* Barista – Cafés / Caixa\n`;
    if (barEntry[2]) b += `${getEntry(barEntry[2])} Bar C: *${barEntry[2].alias}*\n`;

    b += `\n⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR\n——————————————\n\nSELLERS:\n`;
    if (sellers[0]) b += `${getEntry(sellers[0])} Seller A: *${sellers[0].alias}*\n`;
    if (sellers[1]) b += `${getEntry(sellers[1])} Seller B: *${sellers[1].alias}*\n`;
    if (sellers[2]) b += `${getEntry(sellers[2])} Seller C: *${sellers[2].alias}*\n`;

    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\n`;
    if (sellers[0]) b += `Seller A: Mesas 20-30\n`;
    if (sellers[1]) b += `Seller B & C: Mesas 1-12\n`;
    
    // Runners
    const runners = activeStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const rNames = runners.length > 0 ? runners.map(r => r.alias).join(' & ') : "Todos";
    b += `\nRUNNERS: ${rNames}\n——————————————\n\n`;

    // Cleaning & HACCP (Exit Based)
    const bE1 = barExit[0], bL = barExit[barExit.length - 1];
    b += `LIMPEZA BAR:\n`;
    if (bE1) b += `${getExit(bE1)} Preparações: *${bE1.alias}*\n`;
    if (bL) b += `${getExit(bL)} Fecho Bar: *${bL.alias}*\n\n`;

    const sE1 = salaExit[0], sL = salaExit[salaExit.length - 1];
    b += `LIMPEZA SALA:\n`;
    if (sE1) b += `${getExit(sE1)} Sala Cima & Aparador: *${sE1.alias}*\n`;
    if (sL) b += `${getExit(sL)} Fecho Sala & Vidros: *${sL.alias}*\n`;
    b += `${getExit(fechoCaixa)} Fecho de Caixa: *${fechoCaixa.alias}*`;

    // 9. Display in Modal
    const modal = document.getElementById('briefingModal');
    const container = document.getElementById('briefingTextContainer');
    if (modal && container) {
        container.innerText = b;
        modal.style.display = 'flex';
    }
};

window.copyBriefingText = function() {
    const text = document.getElementById('briefingTextContainer').innerText;
    navigator.clipboard.writeText(text).then(() => alert("✅ Copied!"));
};

window.closeBriefingModal = function() { 
    document.getElementById('briefingModal').style.display = 'none'; 
};
