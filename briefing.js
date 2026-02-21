/** Zenith Manager v1.8 - briefing.js **/

window.generateBriefing = function() {
    const selectedDate = document.getElementById('dateSelect').value.trim();
    const data = window.scheduleData;

    if (!data || !data[selectedDate]) return alert("Data not loaded yet.");

    const activeStaff = data[selectedDate].filter(s => s.shiftRaw && /\d/.test(s.shiftRaw));
    if (activeStaff.length === 0) return alert("No active shifts for this date.");

    // Helpers
    const getEntry = (s) => s.shiftRaw.split('-')[0].trim();
    const getExit = (s) => s.shiftRaw.split('-')[1].trim();
    const parseToMin = (t) => { 
        const p = t.split(':'); 
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); 
    };

    // Sorted Lists
    const byEntry = [...activeStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...activeStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    // Area Filtering (Crucial)
    const barE = byEntry.filter(s => s.area.toLowerCase() === 'bar');
    const barX = byExit.filter(s => s.area.toLowerCase() === 'bar');
    const salaE = byEntry.filter(s => s.area.toLowerCase() === 'sala');
    const salaX = byExit.filter(s => s.area.toLowerCase() === 'sala');

    // Role Logic
    const porta = activeStaff.find(s => s.position.toLowerCase().includes('manager')) || salaE[0];
    const sellers = salaE.filter(s => !s.position.toLowerCase().includes('manager') || salaE.length === 1);
    const fechoCaixa = activeStaff.find(s => s.position.toLowerCase().includes('manager')) || activeStaff.find(s => s.position.toLowerCase().includes('head')) || salaX[salaX.length - 1];

    // Template Generation
    let b = `Bom dia a todos!\n\n*BRIEFING ${selectedDate}*\n\n`;
    b += `${getEntry(porta)} Porta: ${porta.alias}\n\n`;

    b += `BAR:\n`;
    if (barE[0]) b += `${getEntry(barE[0])} Bar A (Bebidas): *${barE[0].alias}*\n`;
    if (barE[1]) b += `${getEntry(barE[1])} Bar B (Cafés): *${barE[1].alias}*\n`;
    if (barE[2]) b += `${getEntry(barE[2])} Bar C: *${barE[2].alias}*\n`;

    b += `\n⸻⸻⸻⸻\n\nSELLERS:\n`;
    if (sellers[0]) b += `${getEntry(sellers[0])} Seller A (20-30): *${sellers[0].alias}*\n`;
    if (sellers[1]) b += `${getEntry(sellers[1])} Seller B (1-12): *${sellers[1].alias}*\n`;
    if (sellers[2]) b += `${getEntry(sellers[2])} Seller C (40-57): *${sellers[2].alias}*\n`;

    const runner = activeStaff.filter(s => s.position.toLowerCase().includes('runner'));
    b += `\nRUNNERS: ${runner.map(r => r.alias).join(' e ') || "Equipa"}\n`;
    b += `——————————————\n\nHACCP / LIMPEZA:\n`;
    
    if (barX[barX.length - 1]) b += `${getExit(barX[barX.length - 1])} Fecho Bar: *${barX[barX.length - 1].alias}*\n`;
    if (salaX[salaX.length - 1]) b += `${getExit(salaX[salaX.length - 1])} Fecho Sala: *${salaX[salaX.length - 1].alias}*\n`;
    b += `${getExit(fechoCaixa)} Fecho Caixa: *${fechoCaixa.alias}*`;

    document.getElementById('briefingTextContainer').innerText = b;
    document.getElementById('briefingModal').style.display = 'flex';
};

window.copyBriefingText = function() {
    const text = document.getElementById('briefingTextContainer').innerText;
    navigator.clipboard.writeText(text).then(() => alert("Copied to Clipboard!"));
};

window.closeBriefingModal = function() {
    document.getElementById('briefingModal').style.display = 'none';
};
