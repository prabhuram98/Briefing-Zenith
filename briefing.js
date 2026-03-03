/**
 * BRIEFING GENERATOR - VERSION 1.8.1
 * Changes: 
 * - All HACCP/Cleaning times are now dynamic (based on scheduled exit).
 * - Headseller on Fecho de Caixa is limited to max 1 HACCP task.
 * - Bar A and B are guaranteed to be different people.
 * - Manager is restricted to 'Porta'.
 */

function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayStaff = scheduleData[selectedDate];

    if (!dayStaff || dayStaff.length === 0) {
        alert("Sem dados para a data: " + selectedDate);
        return;
    }

    // --- Time Parsing Helpers ---
    const getEntry = (s) => (s && s.shiftRaw && s.shiftRaw.includes('-')) ? s.shiftRaw.split('-')[0].trim() : "00:00";
    const getExit = (s) => (s && s.shiftRaw && s.shiftRaw.includes('-')) ? s.shiftRaw.split('-')[1].trim() : "00:00";
    const parseMin = (t) => {
        const p = t.split(':');
        return p.length < 2 ? 0 : parseInt(p[0]) * 60 + parseInt(p[1]);
    };
    
    // Sorting logic
    const byEntry = [...dayStaff].sort((a, b) => parseMin(getEntry(a)) - parseMin(getEntry(b)));
    const byExit = [...dayStaff].sort((a, b) => parseMin(getExit(a)) - parseMin(getExit(b)));

    // Role definitions
    const isManager = (s) => s.position.toLowerCase().includes('manager') && !s.position.toLowerCase().includes('bar');
    const isBar = (s) => s.area.toLowerCase() === 'bar';
    const isRunner = (s) => s.position.toLowerCase().includes('runner');
    const isHeadseller = (s) => s.position.toLowerCase().includes('head');

    // --- Grouping ---
    const manager = dayStaff.find(isManager);
    const barEntry = byEntry.filter(isBar);
    const barExit = byExit.filter(isBar);
    const sellersPool = byEntry.filter(s => s.area.toLowerCase() === 'sala' && !isManager(s) && !isRunner(s));
    const runnersList = byEntry.filter(isRunner);
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala' && !isManager(s));

    // Fecho de Caixa Hierarchy
    const headS = dayStaff.find(isHeadseller);
    const barM = dayStaff.find(s => s.position.toLowerCase().includes('bar manager'));
    const fechoCaixa = headS || barM || manager || { alias: "---" };

    const runnerPerson = runnersList.length > 0 ? runnersList[0] : null;
    const runnerName = runnerPerson ? runnerPerson.alias : "TODOS";
    const runnerExitTime = runnerPerson ? getExit(runnerPerson) : "15:00";

    const getPosLabel = (s) => isHeadseller(s) ? "Headseller" : "Seller";

    // --- Build Template ---
    let b = `Segue o briefing para hoje.\nBom dia equipa \n\n`;
    b += `BRIEFING ${selectedDate}\n\n`;
    
    // Porta: Always uses Manager if present
    b += `${getEntry(manager || sellersPool[0])} *Porta*: ${(manager || sellersPool[0]).alias}\n\n`;

    // Bar Section: Ensuring unique A and B
    b += `BAR: \n`;
    if (barEntry[0]) {
        b += `${getEntry(barEntry[0])} *Abertura Sala/Bar*: ${barEntry[0].alias}\n`;
        b += `${getEntry(barEntry[0])} *Bar A: ${barEntry[0].alias} * Barista - Caixa/Bebidas*\n`;
    }
    if (barEntry[1]) b += `${getEntry(barEntry[1])} *Bar B: ${barEntry[1].alias} * Barista - Bebidas /Smoothies\n`;
    if (barEntry[2]) b += `${getEntry(barEntry[2])} *Bar C: ${barEntry[2].alias} * Barista - Bebidas /Smoothies\n`;
    if (barEntry[3]) b += `${getEntry(barEntry[3])} *Bar D: ${barEntry[3].alias} * Barista- Cafés\n`;

    b += `\n________________________\n‼️ *Loiça é responsabilidade de todos.*\n—————————————— \n\nSELLERS:\n`;
    if (sellersPool[0]) b += `${getEntry(sellersPool[0])} Seller A: ${sellersPool[0].alias} *${getPosLabel(sellersPool[0])}*\n`;
    if (sellersPool[1]) b += `${getEntry(sellersPool[1])} Seller B: ${sellersPool[1].alias} *${getPosLabel(sellersPool[1])}*\n`;
    if (sellersPool[2]) b += `${getEntry(sellersPool[2])} Seller C: ${sellersPool[2].alias} *${getPosLabel(sellersPool[2])}*\n`;

    b += `\n\n⚠Pastéis de Nata - Cada Seller na sua secção⚠\n——————————————\n`;
    b += `Seller A: Mesa 20-30\n`;
    b += `Seller B: Mesa 1-12\n`;
    b += `Seller C: Sala de cima \n——————————————\n`;
    
    b += `RUNNERS:\n${runnerPerson ? getEntry(runnerPerson) : "08:00"} *Runner A e B:* ${runnerName}\n——————————————\n\n`;
    b += `‼️Loiça é responsabilidade de todos!\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\n`;

    // HACCP BAR: All times use getExit()
    b += `HACCP/LIMPEZA BAR:\n`;
    if (barExit.length > 0) {
        const b0 = barExit[0];
        const bL = barExit[barExit.length - 1];
        const bM = barExit.length > 2 ? barExit[1] : b0;
        
        b += `${getExit(b0)} Preparações Bar:* ${b0.alias}\n`;
        b += `${getExit(bM)} Reposição Bar:* ${bM.alias}\n`;
        b += `${getExit(bL)} Limpeza Máquina de Café/Reposição de Leites:* ${bL.alias}\n`;
        // Fecho bar usually assigned to last person + whoever is with them
        b += `${getExit(bL)} Fecho Bar:* ${barExit.length > 1 ? bL.alias + " e " + barExit[barExit.length-2].alias : bL.alias}\n\n`;
    }

    // HACCP SALA: All times use dynamic exit times
    b += `HACCP/ SALA:\n`;
    b += `${runnerExitTime} *Limpeza da sala de cima:* ${runnerName}\n`;
    b += `${runnerExitTime} *Limpeza e reposição aparador/cadeira de bebés:* ${runnerName}\n`;
    b += `${runnerExitTime} *Repor papel (casa de banho):* ${runnerName}\n`;

    // Headseller Protection: Filter out the person doing Fecho de Caixa from heavy cleaning
    const haccpPool = sellersPool.filter(s => s.alias !== fechoCaixa.alias);
    const backupStaff = haccpPool.length > 0 ? haccpPool[0] : (sellersPool[1] || sellersPool[0]);

    b += `${getExit(backupStaff)} *Limpeza de Espelhos e vidros:* ${backupStaff.alias}\n`;
    b += `${getExit(backupStaff)} *Limpeza da casa de banho (clientes e staff):* ${backupStaff.alias}\n`;
    
    const lastSeller = salaExit[salaExit.length - 1];
    b += `${getExit(lastSeller)} *Fecho da sala:* ${lastSeller.alias}\n\n`;
    b += `${getExit(fechoCaixa)} *Fecho de Caixa*: ${fechoCaixa.alias}`;

    // --- Clipboard Execution ---
    const el = document.createElement('textarea');
    el.value = b;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("✅ Briefing Copiado!");
}
