/**
 * Zenith Manager v1.8 - briefing.js
 */

window.generateBriefing = function() {
    const dateDropdown = document.getElementById('dateSelect');
    const selectedDate = dateDropdown.value.trim();
    
    // Read data same way like staff data was reading
    const data = window.scheduleData;

    if (!data || Object.keys(data).length === 0) {
        return alert("Data is loading. Please wait...");
    }

    // Match the date (trimming to avoid hidden space errors)
    const matchingKey = Object.keys(data).find(k => k.trim() === selectedDate);
    if (!matchingKey) return alert("Date not found in schedule.");

    const dayStaff = data[matchingKey];

    // Filter people with valid times
    const activeStaff = dayStaff.filter(s => s.shiftRaw && /\d/.test(s.shiftRaw));
    if (activeStaff.length === 0) return alert("No active shifts for this date.");

    // Helpers
    const getEntry = (s) => s.shiftRaw.split('-')[0].trim();
    const getExit = (s) => s.shiftRaw.split('-')[1].trim();
    const parseToMin = (t) => { 
        const p = t.split(':'); 
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); 
    };

    // Sort Entry/Exit
    const byEntry = [...activeStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...activeStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    // Area-based categorization (Bar vs Sala)
    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar');
    const salaEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala');
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala');

    const findStaff = (list, pos) => list.find(s => s.position.toLowerCase().includes(pos.toLowerCase()));

    // Logic Assignments
    let porta = findStaff(activeStaff, 'Manager') || findStaff(activeStaff, 'Head Seller') || salaEntry[0];
    const sellers = salaEntry.filter(s => !s.position.toLowerCase().includes('manager') || salaEntry.length === 1);
    const fechoCaixa = findStaff(activeStaff, 'Head Seller') || findStaff(activeStaff, 'Bar Manager') || findStaff(activeStaff, 'Manager') || salaExit[salaExit.length - 1];

    // Template
    let b = `Bom dia a todos!\n\n*BRIEFING ${matchingKey}*\n\n`;
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

    const runnerStaff = activeStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const runnerTxt = runnerStaff.length > 0 ? runnerStaff.map(r => r.alias).join(' e ') : "Equipa";
    b += `\nRUNNERS:\n${runnerTxt}\n——————————————\n\n`;

    // HACCP / CLEANING
    const bL = barExit[barExit.length - 1];
    const sL = salaExit[salaExit.length - 1];
    b += `HACCP / LIMPEZA:\n`;
    if (bL) b += `${getExit(bL)} Fecho Bar: *${bL.alias}*\n`;
    if (sL) b += `${getExit(sL)} Fecho Sala: *${sL.alias}*\n`;
    b += `${getExit(fechoCaixa)} Fecho de Caixa: *${fechoCaixa.alias}*`;

    document.getElementById('briefingTextContainer').innerText = b;
    document.getElementById('briefingModal').style.display = 'flex';
};

window.copyBriefingText = function() {
    navigator.clipboard.writeText(document.getElementById('briefingTextContainer').innerText).then(() => alert("✅ Copied!"));
};

window.closeBriefingModal = function() { 
    document.getElementById('briefingModal').style.display = 'none'; 
};
