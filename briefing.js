window.generateBriefing = function() {
    // 1. Get selected date from the dropdown
    const dateDropdown = document.getElementById('dateSelect');
    const selectedDate = dateDropdown ? dateDropdown.value : null;

    if (!selectedDate) {
        return alert("Please select a date first.");
    }

    // 2. Access the data exactly where app.js saved it
    const sourceData = window.scheduleData;

    if (!sourceData || Object.keys(sourceData).length === 0) {
        return alert("Data is still syncing from Google Sheets. Give it 2 seconds.");
    }

    const dayStaff = sourceData[selectedDate];
    if (!dayStaff || dayStaff.length === 0) {
        return alert("No staff found in the schedule for " + selectedDate);
    }

    // 3. Filter and Sort (Logic from Daily View)
    const activeStaff = dayStaff.filter(s => s.shiftRaw && /\d/.test(s.shiftRaw));
    
    const getEntry = (s) => s.shiftRaw.split('-')[0].trim();
    const getExit = (s) => s.shiftRaw.split('-')[1].trim();
    const parseToMin = (t) => { 
        const p = t.split(':'); 
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); 
    };

    const byEntry = [...activeStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...activeStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    // 4. Area Assignment (Bar for Bar, Sala for Sala)
    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar');
    const salaEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala');
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala');

    const findStaff = (list, pos) => list.find(s => s.position.toLowerCase().includes(pos.toLowerCase()));

    // 5. Task Logic
    let porta = findStaff(activeStaff, 'Manager') || findStaff(activeStaff, 'Head Seller') || salaEntry[0];
    const sellers = salaEntry.filter(s => !s.position.toLowerCase().includes('manager') || salaEntry.length === 1);
    const fechoCaixa = findStaff(activeStaff, 'Head Seller') || findStaff(activeStaff, 'Bar Manager') || findStaff(activeStaff, 'Manager') || salaExit[salaExit.length - 1];

    // 6. Build the text string
    let b = `Bom dia a todos!\n\n*BRIEFING ${selectedDate}*\n\n`;
    b += `${getEntry(porta)} Porta: ${porta.alias}\n\n`;

    b += `BAR:\n`;
    if (barEntry[0]) b += `${getEntry(barEntry[0])} Bar A: *${barEntry[0].alias}*\n`;
    if (barEntry[1]) b += `${getEntry(barEntry[1])} Bar B: *${barEntry[1].alias}*\n`;

    b += `\nSELLERS:\n`;
    if (sellers[0]) b += `${getEntry(sellers[0])} Seller A: *${sellers[0].alias}*\n`;
    if (sellers[1]) b += `${getEntry(sellers[1])} Seller B: *${sellers[1].alias}*\n`;

    b += `\n——————————————\nCLEANING:\n`;
    if (barExit[barExit.length - 1]) {
        const lastBar = barExit[barExit.length - 1];
        b += `${getExit(lastBar)} Fecho Bar: *${lastBar.alias}*\n`;
    }
    if (salaExit[salaExit.length - 1]) {
        const lastSala = salaExit[salaExit.length - 1];
        b += `${getExit(lastSala)} Fecho Sala: *${lastSala.alias}*\n`;
    }
    b += `${getExit(fechoCaixa)} Fecho de Caixa: *${fechoCaixa.alias}*`;

    // 7. Show Modal
    const modal = document.getElementById('briefingModal');
    const container = document.getElementById('briefingTextContainer');
    if (modal && container) {
        container.innerText = b;
        modal.style.display = 'flex';
    }
};

window.copyBriefingText = function() {
    const txt = document.getElementById('briefingTextContainer').innerText;
    navigator.clipboard.writeText(txt).then(() => alert("✅ Briefing Copied!"));
};

window.closeBriefingModal = function() { 
    document.getElementById('briefingModal').style.display = 'none'; 
};
