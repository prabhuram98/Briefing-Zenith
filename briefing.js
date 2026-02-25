function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayStaff = scheduleData[selectedDate];

    if (!dayStaff || dayStaff.length === 0) {
        alert("Sem dados para a data: " + selectedDate);
        return;
    }

    // Helpers to handle time safely
    const getEntry = (s) => (s.shiftRaw && s.shiftRaw.includes('-')) ? s.shiftRaw.split('-')[0].trim() : "00:00";
    const getExit = (s) => (s.shiftRaw && s.shiftRaw.includes('-')) ? s.shiftRaw.split('-')[1].trim() : "00:00";
    const parseToMin = (tStr) => {
        const p = tStr.split(':');
        return p.length < 2 ? 0 : parseInt(p[0]) * 60 + parseInt(p[1]);
    };
    
    // Sort logic
    const byEntry = [...dayStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...dayStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    // Filtering by Area
    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar');
    const salaEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala');
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala');

    const findStaff = (list, pos) => list.find(s => s.position.toLowerCase().includes(pos.toLowerCase()));

    // --- MANAGER RULE ---
    // If manager exists, they take Abertura and are removed from other task pools
    const manager = findStaff(dayStaff, 'Manager');
    
    // Create pools excluding Manager for Sellers and HACCP
    const sellers = salaEntry.filter(s => s.position.toLowerCase() !== 'manager');
    const barHACCP = barEntry.filter(s => s.position.toLowerCase() !== 'manager');
    const barHACCPExit = barExit.filter(s => s.position.toLowerCase() !== 'manager');
    const salaHACCPExit = salaExit.filter(s => s.position.toLowerCase() !== 'manager');

    // Assignments
    let opener = manager || barEntry[0] || salaEntry[0];
    const fechoCaixa = salaHACCPExit[salaHACCPExit.length - 1] || barHACCPExit[barHACCPExit.length - 1] || opener;

    // --- TEMPLATE CONSTRUCTION ---
    let b = `*Abertura Sala/Bar*: ${opener.alias}\n`;
    b += `________________________\n\n`;

    b += `SELLERS:\n\n`;
    b += `Seller A: ${sellers[0] ? sellers[0].alias : "---"}\n`;
    b += `Seller B: ${sellers[1] ? sellers[1].alias : "---"}\n\n`;

    b += `Seller A: Mesa 20-30\n`;
    b += `Seller B: Mesa 1-12\n`;
    b += `Seller C: ${sellers[2] ? sellers[2].alias : "---"} (Sala de cima)\n`;
    b += `——————————————\n`;

    const runnerStaff = dayStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const runnerTxt = runnerStaff.length > 0 ? runnerStaff.map(r => r.alias).join(' e ') : "TODOS";
    b += `RUNNERS:\n`;
    b += `Runner A e B: ${runnerTxt}\n`;
    b += `——————————————\n\n`;

    // HACCP BAR - Bar Staff Only (Excluding Manager)
    b += `HACCP/LIMPEZA BAR:\n`;
    if (barHACCP.length > 0) {
        const bL = barHACCPExit[barHACCPExit.length - 1];
        b += `*Preparações Bar:* ${barHACCP[0].alias}\n\n`;
        b += `*Reposição Bar:* ${barHACCP[1] ? barHACCP[1].alias : barHACCP[0].alias}\n\n`;
        b += `*Limpeza Máquina de Café/Reposição de Leites:* ${bL.alias}\n\n`;
        b += `*Fecho Bar:* ${bL.alias}\n\n\n`;
    }

    // HACCP SALA - Sala Staff Only (Excluding Manager)
    const sA = sellers[0] ? sellers[0].alias : "---";
    const sB = sellers[1] ? sellers[1].alias : "---";
    const sC = sellers[2] ? sellers[2].alias : "---";
    const sL = salaHACCPExit.length > 0 ? salaHACCPExit[salaHACCPExit.length - 1].alias : "---";

    b += `HACCP/ :\n`;
    b += `*Limpeza da sala de cima: ${sC}\n`;
    b += `*Limpeza e reposição aparador/cadeira de bebés:* ${sA}\n`;
    b += `*Repor papel  (casa de banho):* ${sB}\n`;
    b += `*Limpeza de Espelhos e vidros:* ${sA}\n`;
    b += `*Limpeza da casa de banho clientes e staff):* ${sB}\n`;
    b += `*Fecho da sala:* ${sL}\n`;
    b += `*Fecho de Caixa*: ${fechoCaixa.alias}`;

    // Copying logic
    const el = document.createElement('textarea'); 
    el.value = b; 
    document.body.appendChild(el); 
    el.select(); 
    document.execCommand('copy'); 
    document.body.removeChild(el);
    
    alert("✅ Briefing Copiado!\n\n" + b);
}
