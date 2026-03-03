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

    const findStaff = (list, pos) => list.find(s => s.position.toLowerCase().includes(pos.toLowerCase()));

    // Rule: Manager only does Porta
    const manager = findStaff(dayStaff, 'Manager');

    // Filter staff by area, excluding Manager from standard task pools
    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar' && s.position.toLowerCase() !== 'manager');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar' && s.position.toLowerCase() !== 'manager');
    const salaEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala' && s.position.toLowerCase() !== 'manager');
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala' && s.position.toLowerCase() !== 'manager');

    // Fecho de Caixa Hierarchy: Head Seller > Bar Manager > Manager
    const fechoCaixa = findStaff(dayStaff, 'Head Seller') || 
                       findStaff(dayStaff, 'Bar Manager') || 
                       manager || 
                       { alias: "---", shiftRaw: "00:00-00:00" };

    // Runner Logic
    const runnerStaff = dayStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const runnerTxt = runnerStaff.length > 0 ? runnerStaff.map(r => r.alias).join(' e ') : "TODOS";
    const runnerTime = runnerStaff.length > 0 ? getEntry(runnerStaff[0]) : "08:30";

    // Assignments for Template
    const porta = manager || salaEntry[0] || byEntry[0];
    const sA = salaEntry[0] || { alias: "---", position: "---" };
    const sB = salaEntry[1] || { alias: "---", position: "---" };
    const sC = salaEntry[2] || { alias: "---" };

    const dateParts = selectedDate.split('/');
    const dateTitle = dateParts[0] + '/' + (dateParts[1] ? dateParts[1] : "");

    // --- TEMPLATE CONSTRUCTION ---
    let b = `Segue o briefing para hoje.\n`;
    b += `Bom dia equipa \n\n`;
    b += `BRIEFING ${dateTitle}\n\n`;
    b += `${getEntry(porta)} *Porta*: ${porta.alias}\n\n`;

    b += `BAR: \n`;
    if (barEntry[0]) {
        b += `${getEntry(barEntry[0])} *Abertura Sala/Bar*: ${barEntry[0].alias}\n`;
        b += `${getEntry(barEntry[0])} *Bar A: ${barEntry[0].alias} *Barista - Caixa/Smoothies*\n`;
        b += `${getEntry(barEntry[0])} *Bar B: ${barEntry[0].alias} *Barista - Bebidas*\n`;
    }
    if (barEntry[1]) {
        b += `${getEntry(barEntry[1])} *Bar C: ${barEntry[1].alias} *Barista - Café*\n`;
    }

    b += `\n________________________\n`;
    b += `‼️ *Loiça é responsabilidade de todos.*\n`;
    b += `—————————————— \n\n`;

    b += `SELLERS:\n`;
    b += `${getEntry(sA)} Seller A:* ${sA.alias} *${sA.position}*\n`;
    b += `${getEntry(sB)} Seller B :* ${sB.alias} *${sB.position}*\n`;

    b += `\n\n⚠Pastéis de Nata - Cada Seller em sua secção⚠\n`;
    b += `——————————————\n`;
    b += `Seller A: Mesa 20-28\n`;
    b += `Seller B: Mesa 1-18\n`;
    b += `Seller C: ${sC.alias} (Sala de cima) \n`;
    b += `——————————————\n`;
    
    b += `RUNNERS:\n`;
    b += `${runnerTime} *Runner A e B:* ${runnerTxt}\n\n`;
    
    b += `——————————————\n`;
    b += `Runner A:* Bebidas \n`;
    b += `Runner B:* Comidas\n\n`;
    b += `‼️Loiça é responsabilidade de todos!\n`;
    b += `NÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n`;
    b += `——————————————\n\n`;

    b += `HACCP/LIMPEZA BAR:\n`;
    if (barExit.length > 0) {
        const bE0 = barExit[0];
        const bL = barExit[barExit.length - 1];
        b += `${getExit(bE0)} Reposição Bar:* ${bE0.alias}\n`;
        b += `${getExit(bE0)} Limpeza Máquina de Café/Reposição de Leites:* ${bE0.alias}\n`;
        b += `${getExit(bE0)} Preparações Bar:* ${bE0.alias}\n`;
        b += `${getExit(bL)} Fecho Bar:* ${bL.alias} \n\n\n`;
    }

    b += `HACCP/ SALA:\n`;
    if (salaExit.length > 0) {
        const s0 = salaExit[0];
        const sL = salaExit[salaExit.length - 1];
        b += `${getExit(s0)} *Fecho da sala de cima:* ${s0.alias}\n`;
        b += `${getExit(s0)} *Repor papel (casa de banho):* ${s0.alias}\n`;
        b += `${getExit(s0)} *Limpeza e reposição aparador/cadeira de bebés :*${s0.alias}\n`;
        b += `17:30 *Limpeza de Espelhos e vidros:* \n${sA.alias}\n`;
        b += `17:30 *Limpeza da casa de banho (clientes e staff):* ${sB.alias}\n`;
        b += `${getExit(sL)} *Fecho da sala:* ${sL.alias}\n\n`;
        b += `${getExit(fechoCaixa)} *Fecho de Caixa*: ${fechoCaixa.alias}`;
    }

    const el = document.createElement('textarea');
    el.value = b;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("✅ Briefing Copiado!\n\n" + b);
}

