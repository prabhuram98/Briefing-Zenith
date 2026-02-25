function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayStaff = scheduleData[selectedDate];

    if (!dayStaff || dayStaff.length === 0) {
        alert("Sem dados para a data: " + selectedDate);
        return;
    }

    // --- SAFETY HELPER FUNCTIONS ---
    const getEntry = (s) => {
        if (!s.shiftRaw || !s.shiftRaw.includes('-')) return "00:00";
        return s.shiftRaw.split('-')[0].trim();
    };
    
    const getExit = (s) => {
        if (!s.shiftRaw || !s.shiftRaw.includes('-')) return "00:00";
        return s.shiftRaw.split('-')[1].trim();
    };

    const parseToMin = (tStr) => {
        const p = tStr.split(':');
        if (p.length < 2) return 0;
        return parseInt(p[0]) * 60 + parseInt(p[1]);
    };
    
    // --- SORTING ---
    const byEntry = [...dayStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...dayStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    // --- ROLE SEPARATION ---
    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar');
    const salaEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala');
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala');

    const findStaff = (list, pos) => list.find(s => s.position.toLowerCase().includes(pos.toLowerCase()));

    // --- ASSIGNMENTS ---
    let opener = barEntry.length > 0 ? barEntry[0] : { alias: "Manager", shiftRaw: "08:00-17:00" };
    const runnerStaff = dayStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const lastSala = salaExit.length > 0 ? salaExit[salaExit.length - 1] : salaEntry[0];

    // --- TEMPLATE GENERATION ---
    let b = `*Abertura Sala/Bar*: ${opener.alias}\n`;
    b += `________________________\n\n`;
    
    b += `SELLERS:\n\n`;
    b += `Seller A: ${salaEntry[0] ? salaEntry[0].alias : "---"}\n`;
    b += `Seller B: ${salaEntry[1] ? salaEntry[1].alias : "---"}\n\n`;
    
    b += `Seller A: Mesa 20-30\n`;
    b += `Seller B: Mesa 1-12\n`;
    b += `Seller C: ${salaEntry[2] ? salaEntry[2].alias : "---"} (Sala de cima)\n`;
    
    b += `——————————————\n`;
    b += `RUNNERS:\n`;
    const runnerTxt = runnerStaff.length > 0 ? runnerStaff.map(r => r.alias).join(' e ') : "TODOS";
    b += `Runner A e B: ${runnerTxt}\n`;
    b += `——————————————\n\n`;

    b += `HACCP/LIMPEZA BAR:\n`;
    if (barEntry.length > 0) {
        const bL = barExit[barExit.length - 1];
        b += `*Preparações Bar:* ${barEntry[0].alias}\n\n`;
        b += `*Reposição Bar:* ${barEntry[1] ? barEntry[1].alias : barEntry[0].alias}\n\n`;
        b += `*Limpeza Máquina de Café/Reposição de Leites:* ${bL.alias}\n\n`;
        b += `*Fecho Bar:* ${bL.alias}\n\n\n`;
    }

    b += `HACCP/ :\n`;
    const sA = salaEntry[0] ? salaEntry[0].alias : "---";
    const sB = salaEntry[1] ? salaEntry[1].alias : "---";
    const sC = salaEntry[2] ? salaEntry[2].alias : "---";

    b += `*Limpeza da sala de cima: ${sC}\n`;
    b += `*Limpeza e reposição aparador/cadeira de bebés:* ${sA}\n`;
    b += `*Repor papel  (casa de banho):* ${sB}\n`;
    b += `*Limpeza de Espelhos e vidros:* ${sA}\n`;
    b += `*Limpeza da casa de banho clientes e staff):* ${sB}\n`;
    b += `*Fecho da sala:* ${lastSala.alias}\n`;
    b += `*Fecho de Caixa*: ${lastSala.alias}`;

    // --- COPY TO CLIPBOARD ---
    navigator.clipboard.writeText(b).then(() => {
        alert("✅ Briefing Copiado com Sucesso!");
    }).catch(err => {
        // Fallback for older browsers
        const el = document.createElement('textarea');
        el.value = b;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        alert("✅ Briefing Copiado!");
    });
}

