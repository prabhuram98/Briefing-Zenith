Aqui está o código do briefing.js atualizado para seguir exatamente o seu novo template, mantendo as regras de separação entre Bar e Sala e a regra do Manager, sem alterar a estrutura lógica de busca de dados.
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

    // Filtros de Área e Manager
    const manager = findStaff(dayStaff, 'Manager');
    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar' && s.position.toLowerCase() !== 'manager');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar' && s.position.toLowerCase() !== 'manager');
    const salaEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala' && s.position.toLowerCase() !== 'manager');
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala' && s.position.toLowerCase() !== 'manager');

    // Atribuições baseadas no template
    const porta = manager || salaEntry[0] || byEntry[0];
    const opener = barEntry[0] || byEntry[0];
    const runnerStaff = dayStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const fechoCaixa = manager || findStaff(salaExit, 'Head Seller') || salaExit[salaExit.length - 1];

    // Formatação da Data para o Título (Ex: 3/03)
    const dateParts = selectedDate.split('/');
    const dateTitle = dateParts[0] + '/' + (dateParts[1] ? dateParts[1] : "");

    // --- CONSTRUÇÃO DO TEMPLATE EXACTO ---
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
    if (salaEntry[0]) b += `${getEntry(salaEntry[0])} Seller A:* ${salaEntry[0].alias} *${salaEntry[0].position}*\n`;
    if (salaEntry[1]) b += `${getEntry(salaEntry[1])} Seller B :* ${salaEntry[1].alias} *${salaEntry[1].position}*\n`;

    b += `\n\n⚠Pastéis de Nata - Cada Seller em sua secção⚠\n`;
    b += `——————————————\n`;
    b += `Seller A: Mesa 20-28\n`;
    b += `Seller B: Mesa 1-18\n`;
    b += `Seller C: Sala de cima \n`;
    b += `——————————————\n`;
    
    b += `RUNNERS:\n`;
    const runnerTxt = runnerStaff.length > 0 ? runnerStaff.map(r => r.alias).join(' e ') : "TODOS";
    const runnerTime = runnerStaff.length > 0 ? getEntry(runnerStaff[0]) : "08:30";
    b += `${runnerTime} *Runner A e B:* ${runnerTxt}\n\n`;
    
    b += `——————————————\n`;
    b += `Runner A:* Bebidas \n`;
    b += `Runner B:* Comidas\n\n`;
    b += `‼️Loiça é responsabilidade de todos!\n`;
    b += `NÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n`;
    b += `——————————————\n\n`;

    b += `HACCP/LIMPEZA BAR:\n`;
    if (barExit.length > 0) {
        const bL = barExit[barExit.length - 1];
        b += `${getExit(barExit[0])} Reposição Bar:* ${barExit[0].alias}\n`;
        b += `${getExit(barExit[0])} Limpeza Máquina de Café/Reposição de Leites:* ${barExit[0].alias}\n`;
        b += `17:30 Preparações Bar:* TODOS\n`;
        b += `${getExit(bL)} Fecho Bar:* ${bL.alias} \n\n\n`;
    }

    b += `HACCP/ SALA:\n`;
    if (salaExit.length > 0) {
        const s0 = salaExit[0];
        const sL = salaExit[salaExit.length - 1];
        b += `${getExit(s0)} *Fecho da sala de cima:* ${s0.alias}\n`;
        b += `${getExit(s0)} *Repor papel (casa de banho):* ${s0.alias}\n`;
        b += `${getExit(s0)} *Limpeza e reposição aparador/cadeira de bebés :*${s0.alias}\n`;
        b += `17:30 *Limpeza de Espelhos e vidros:* \n${salaEntry[0] ? salaEntry[0].alias : "---"}\n`;
        b += `17:30 *Limpeza da casa de banho (clientes e staff):* ${salaEntry[1] ? salaEntry[1].alias : s0.alias}\n`;
        b += `${getExit(sL)} *Fecho da sala:* ${sL.alias}\n\n`;
        b += `${getExit(fechoCaixa)} *Fecho de Caixa*: ${fechoCaixa.alias}`;
    }

    // Lógica de cópia
    const el = document.createElement('textarea');
    el.value = b;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("✅ Briefing Copiado!\n\n" + b);
}

