function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayStaff = scheduleData[selectedDate];

    if (!dayStaff || dayStaff.length === 0) {
        alert("Sem dados para a data: " + selectedDate);
        return;
    }

    // --- SAFETY HELPERS ---
    const getEntry = (s) => (s.shiftRaw && s.shiftRaw.includes('-')) ? s.shiftRaw.split('-')[0].trim() : "00:00";
    const getExit = (s) => (s.shiftRaw && s.shiftRaw.includes('-')) ? s.shiftRaw.split('-')[1].trim() : "00:00";
    const parseToMin = (tStr) => {
        const p = tStr.split(':');
        return p.length < 2 ? 0 : parseInt(p[0]) * 60 + parseInt(p[1]);
    };
    
    // --- SORTING ---
    const byEntry = [...dayStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...dayStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    // --- STRICT AREA FILTERING ---
    const barStaffEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar');
    const barStaffExit = byExit.filter(s => s.area.toLowerCase() === 'bar');
    const salaStaffEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala');
    const salaStaffExit = byExit.filter(s => s.area.toLowerCase() === 'sala');

    // --- ASSIGNMENTS ---
    // Abertura: First Bar staff to enter
    const opener = barStaffEntry.length > 0 ? barStaffEntry[0] : { alias: "Manager", shiftRaw: "08:00-17:00" };
    
    // Sellers: First three Sala staff to enter
    const sA = salaStaffEntry[0] ? salaStaffEntry[0].alias : "---";
    const sB = salaStaffEntry[1] ? salaStaffEntry[1].alias : "---";
    const sC = salaStaffEntry[2] ? salaStaffEntry[2].alias : "---";

    // Runners: Check for 'Runner' position
    const runnerStaff = dayStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const runnerTxt = runnerStaff.length > 0 ? runnerStaff.map(r => r.alias).join(' e ') : "TODOS";

    // Fecho: Last Sala staff to exit
    const closer = salaStaffExit.length > 0 ? salaStaffExit[salaStaffExit.length - 1] : { alias: "---" };

    // --- TEMPLATE ---
    let b = `*Abertura Sala/Bar*: ${opener.alias}\n`;
    b += `________________________\n\n`;
    
    b += `SELLERS:\n\n`;
    b += `Seller A: ${sA}\n`;
    b += `Seller B: ${sB}\n\n`;
    b += `Seller A: Mesa 20-30\n`;
    b += `Seller B: Mesa 1-12\n`;
    b += `Seller C: ${sC} (Sala de cima)\n`;
    b += `——————————————\n`;
    b += `RUNNERS:\n`;
    b += `Runner A e B: ${runnerTxt}\n`;
    b += `——————————————\n\n`;
    
    // HACCP BAR - Strictly Bar Staff
    b += `HACCP/LIMPEZA BAR:\n`;
    if (barStaffEntry.length > 0) {
        const bL = barStaffExit[barStaffExit.length - 1];
        b += `*Preparações Bar:* ${barStaffEntry[0].alias}\n\n`;
        b += `*Reposição Bar:* ${barStaffEntry[1] ? barStaffEntry[1].alias : barStaffEntry[0].alias}\n\n`;
        b += `*Limpeza Máquina de Café/Reposição de Leites:* ${bL.alias}\n\n`;
        b += `*Fecho Bar:* ${bL.alias}\n\n\n`;
    } else {
        b += `_Sem staff de Bar atribuído_\n\n\n`;
    }
    
    // HACCP SALA - Strictly Sala Staff
    b += `HACCP/ :\n`;
    if (salaStaffEntry.length > 0) {
        b += `*Limpeza da sala de cima: ${sC}\n`;
        b += `*Limpeza e reposição aparador/cadeira de bebés:* ${sA}\n`;
        b += `*Repor papel  (casa de banho):* ${sB}\n`;
        b += `*Limpeza de Espelhos e vidros:* ${sA}\n`;
        b += `*Limpeza da casa de banho clientes e staff):* ${sB}\n`;
        b += `*Fecho da sala:* ${closer.alias}\n`;
        b += `*Fecho de Caixa*: ${closer.alias}`;
    } else {
        b += `_Sem staff de Sala atribuído_`;
    }

    // --- CLIPBOARD ---
    const el = document.createElement('textarea');
    el.value = b;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    
    alert("✅ Briefing Copiado!\n\n" + b);
}
