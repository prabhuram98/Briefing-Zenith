function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayStaff = scheduleData[selectedDate];

    if (!dayStaff || dayStaff.length === 0) {
        alert("Sem dados para a data: " + selectedDate);
        return;
    }

    const getEntry = (s) => (s.shiftRaw && s.shiftRaw.includes('-')) ? s.shiftRaw.split('-')[0].trim() : "00:00";
    const getExit = (s) => (s.shiftRaw && s.shiftRaw.includes('-')) ? s.shiftRaw.split('-')[1].trim() : "00:00";
    const parseToMin = (tStr) => {
        const p = tStr.split(':');
        return p.length < 2 ? 0 : parseInt(p[0]) * 60 + parseInt(p[1]);
    };
    
    const byEntry = [...dayStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...dayStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    const findStaff = (list, pos) => list.find(s => s.position.toLowerCase().includes(pos.toLowerCase()));

    // Rule: Manager only does Porta
    const manager = findStaff(dayStaff, 'Manager');

    // Filters
    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar' && s.position.toLowerCase() !== 'manager');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar' && s.position.toLowerCase() !== 'manager');
    const sellersPool = byEntry.filter(s => 
        s.area.toLowerCase() === 'sala' && 
        s.position.toLowerCase() !== 'manager' && 
        !s.position.toLowerCase().includes('runner')
    );
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala' && s.position.toLowerCase() !== 'manager');

    // Fecho de Caixa Hierarchy: Head Seller > Bar Manager > Manager
    const fechoCaixa = findStaff(dayStaff, 'Head Seller') || 
                       findStaff(dayStaff, 'Bar Manager') || 
                       manager || 
                       { alias: "---" };

    const runnerPerson = findStaff(dayStaff, 'Runner');
    const runnerTxt = runnerPerson ? runnerPerson.alias : "TODOS";
    const runnerTime = runnerPerson ? getEntry(runnerPerson) : "08:30";

    const getPosLabel = (s) => {
        const p = s.position.toLowerCase();
        if (p.includes('head')) return "Headseller";
        return "Seller";
    };

    const dateParts = selectedDate.split('/');
    const dateTitle = dateParts[0] + '/' + (dateParts[1] ? dateParts[1] : "");

    // --- TEMPLATE CONSTRUCTION ---
    let b = `Segue o briefing para hoje.\n`;
    b += `Bom dia equipa \n\n`;
    b += `BRIEFING ${dateTitle}\n\n`;
    b += `${getEntry(manager || sellersPool[0])} *Porta*: ${(manager || sellersPool[0]).alias}\n\n`;

    b += `BAR: \n`;
    if (barEntry[0]) {
        b += `${getEntry(barEntry[0])} *Abertura Sala/Bar*: ${barEntry[0].alias}\n`;
        b += `${getEntry(barEntry[0])} *Bar A: ${barEntry[0].alias} *Barista - Caixa/Smoothies*\n`;
    }
    if (barEntry[1]) b += `${getEntry(barEntry[1])} *Bar B: ${barEntry[1].alias} *Barista - Bebidas*\n`;
    if (barEntry[2]) b += `${getEntry(barEntry[2])} *Bar C: ${barEntry[2].alias} *Barista - Café*\n`;
    if (barEntry[3]) b += `${getEntry(barEntry[3])} *Bar D: ${barEntry[3].alias} *Barista*\n`;

    b += `\n________________________\n`;
    b += `‼️ *Loiça é responsabilidade de todos.*\n`;
    b += `—————————————— \n\n`;

    b += `SELLERS:\n`;
    if (sellersPool[0]) b += `${getEntry(sellersPool[0])} Seller A:* ${sellersPool[0].alias} *${getPosLabel(sellersPool[0])}*\n`;
    if (sellersPool[1]) b += `${getEntry(sellersPool[1])} Seller B :* ${sellersPool[1].alias} *${getPosLabel(sellersPool[1])}*\n`;
    if (sellersPool[2]) b += `${getEntry(sellersPool[2])} Seller C :* ${sellersPool[2].alias} *${getPosLabel(sellersPool[2])}*\n`;

    b += `\n\n⚠Pastéis de Nata - Cada Seller em sua secção⚠\n`;
    b += `——————————————\n`;
    b += `Seller A: Mesa 20-28\n`;
    b += `Seller B: Mesa 1-18\n`;
    b += `Seller C: Sala de cima \n`;
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
        const bFirst = barExit[0];
        const bLast = barExit[barExit.length - 1];
        // If there is someone in the middle (like Carol), they take machine tasks
        const bMid = barExit.length > 2 ? barExit[1] : bFirst;

        b += `${getExit(bFirst)} Reposição Bar:* ${bFirst.alias}\n`;
        b += `${getExit(bMid)} Limpeza Máquina de Café/Reposição de Leites:* ${bMid.alias}\n`;
        b += `${getExit(bMid)} Preparações Bar:* ${bMid.alias}\n`;
        b += `${getExit(bLast)} Fecho Bar:* ${bLast.alias} \n\n\n`;
    }

    b += `HACCP/ SALA:\n`;
    if (salaExit.length > 0) {
        const s0 = salaExit[0];
        const sL = salaExit[salaExit.length - 1];
        b += `${getExit(s0)} *Fecho da sala de cima:* ${s0.alias}\n`;
        b += `${getExit(s0)} *Repor papel (casa de banho):* ${s0.alias}\n`;
        b += `${getExit(s0)} *Limpeza e reposição aparador/cadeira de bebés :*${s0.alias}\n`;
        b += `17:30 *Limpeza de Espelhos e vidros:* \n${sellersPool[0] ? sellersPool[0].alias : "---"}\n`;
        b += `17:30 *Limpeza da casa de banho (clientes e staff):* ${sellersPool[1] ? sellersPool[1].alias : s0.alias}\n`;
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
