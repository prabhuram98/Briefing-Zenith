/* ZENITH MANAGER - BRIEFING ENGINE v1.8 */

function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayStaff = scheduleData[selectedDate];

    // Safety check: Only process if staff exists for that day
    if (!dayStaff || dayStaff.length === 0) {
        alert("Sem dados para a data: " + selectedDate);
        return;
    }

    // --- STEP 1: FILTER ONLY STAFF WITH VALID TIMES ---
    // Excludes "OFF", "FOLGA", or empty shifts
    const activeStaff = dayStaff.filter(s => s.shiftRaw && /\d/.test(s.shiftRaw));

    if (activeStaff.length === 0) {
        alert("Nenhum funcionário com horário atribuído para este dia.");
        return;
    }

    // --- STEP 2: PARSING HELPERS ---
    const getEntry = (s) => s.shiftRaw.split('-')[0].trim();
    const getExit = (s) => s.shiftRaw.split('-')[1].trim();
    const parseToMin = (tStr) => {
        const p = tStr.split(':');
        return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
    };

    // --- STEP 3: SORTING BY EXACT TIMES ---
    const byEntry = [...activeStaff].sort((a, b) => parseToMin(getEntry(a)) - parseToMin(getEntry(b)));
    const byExit = [...activeStaff].sort((a, b) => parseToMin(getExit(a)) - parseToMin(getExit(b)));

    const barEntry = byEntry.filter(s => s.area.toLowerCase() === 'bar');
    const barExit = byExit.filter(s => s.area.toLowerCase() === 'bar');
    const salaEntry = byEntry.filter(s => s.area.toLowerCase() === 'sala');
    const salaExit = byExit.filter(s => s.area.toLowerCase() === 'sala');

    const findStaff = (list, pos) => list.find(s => s.position.toLowerCase().includes(pos.toLowerCase()));

    // --- STEP 4: ASSIGNMENT LOGIC ---

    // PORTA Priority: Manager -> Head Seller -> Earliest Sala
    let porta = findStaff(activeStaff, 'Manager') || findStaff(activeStaff, 'Head Seller') || salaEntry[0];

    // SELLERS: Exclude Manager unless they are the only ones.
    const sellers = salaEntry.filter(s => !s.position.toLowerCase().includes('manager') || salaEntry.length === 1);
    
    // CAIXA Priority: Head Seller -> Bar Manager -> Manager -> Last Sala
    const fechoCaixa = findStaff(activeStaff, 'Head Seller') || 
                       findStaff(activeStaff, 'Bar Manager') || 
                       findStaff(activeStaff, 'Manager') || 
                       salaExit[salaExit.length - 1];

    // --- STEP 5: BUILD THE TEMPLATE (STRICT VERSION) ---
    let b = `Bom dia a todos!\n\n`;
    b += `*BRIEFING ${selectedDate.split('/')[0]}/${selectedDate.split('/')[1]}*\n\n`;
    
    // PORTA
    b += `${getEntry(porta)} Porta: ${porta.alias}\n\n`;

    // BAR SECTION
    b += `BAR:\n`;
    if (barEntry[0]) {
        b += `${getEntry(barEntry[0])} Abertura Sala/Bar: *${barEntry[0].alias}*\n`;
        b += `${getEntry(barEntry[0])} Bar A: *${barEntry[0].alias}* Barista – Bebidas\n`;
    }
    if (barEntry[1]) b += `${getEntry(barEntry[1])} Bar B: *${barEntry[1].alias}* Barista – Cafés / Caixa\n`;
    if (barEntry[2]) b += `${getEntry(barEntry[2])} Bar C: *${barEntry[2].alias}*\n`;
    if (barEntry[3]) b += `${getEntry(barEntry[3])} Bar D: *${barEntry[3].alias}*\n`;

    b += `\n⸻⸻⸻⸻\n\n`;
    b += `‼️ Loiça é responsabilidade de todos.\n`;
    b += `NÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n`;
    b += `——————————————\n\n`;

    // SELLERS SECTION
    b += `SELLERS:\n`;
    if (sellers[0]) b += `${getEntry(sellers[0])} Seller A: *${sellers[0].alias}*\n`;
    if (sellers[1]) b += `${getEntry(sellers[1])} Seller B: *${sellers[1].alias}*\n`;
    if (sellers[2]) b += `${getEntry(sellers[2])} Seller C: *${sellers[2].alias}*\n`;

    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n`;
    b += `——————————————\n`;
    if (sellers[0]) b += `Seller A: Mesas 20-30\n`;
    if (sellers[1]) b += `Seller B & C: Mesas 1-12\n`;
    if (sellers[2]) b += `Seller C: Mesas 40-57\n`;
    b += `——————————————\n\n`;

    // RUNNERS SECTION
    const runnerStaff = activeStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const runnerTxt = runnerStaff.length > 0 ? runnerStaff.map(r => r.alias).join(' e ') : "Todos";
    const runnerTime = runnerStaff.length > 0 ? getEntry(runnerStaff[0]) : (salaEntry[0] ? getEntry(salaEntry[0]) : "08:00");
    b += `RUNNERS:\n${runnerTime} Runner A e B: ${runnerTxt}\n`;
    b += `——————————————\n\n`;

    // HACCP BAR
    const bE1 = barExit[0], bE2 = barExit[1], bL = barExit[barExit.length - 1];
    b += `HACCP / LIMPEZA BAR:\n`;
    if (bE1) b += `${getExit(bE1)} Preparações Bar: *${bE1.alias}*\n`;
    if (bE2) {
        b += `${getExit(bE2)} Reposição Bar: *${bE2.alias}*\n`;
    } else if (bL) {
        b += `${getExit(bL)} Limpeza Máquina de Café / Reposição de Leites: *${bL.alias}*\n`;
    }
    if (bL) b += `${getExit(bL)} Fecho Bar: *${bL.alias}*\n\n`;

    // HACCP SALA
    const sE1 = salaExit[0], sE2 = salaExit[1] || sE1, sE3 = salaExit[2], sL = salaExit[salaExit.length - 1];
    const wcS = barExit[1] ? barExit[1].alias : (sE3 ? sE3.alias : sL.alias);
    const mirrorS = sE3 ? sE3.alias : sL.alias;

    b += `HACCP / SALA:\n`;
    if (sE1) b += `${getExit(sE1)} Fecho do sala de cima: *${sE1.alias}*\n`;
    if (sE1) b += `${getExit(sE1)} Limpeza e reposição aparador / cadeira de bebés: *${sE1.alias}*\n`;
    if (sE2) b += `${getExit(sE2)} Repor papel (casa de banho): *${sE2.alias}*\n`;
    b += `${(barExit[1] || sE3 || sL) ? getExit(barExit[1] || sE3 || sL) : getExit(sL)} Limpeza casa de banho (clientes e staff): *${wcS}*\n`;
    b += `${getExit(sE3 || sL)} Limpeza vidros e Espelhos: *${mirrorS}*\n`;
    if (sL) b += `Fecho da sala: *${sL.alias}*\n`;
    b += `${getExit(fechoCaixa)} Fecho de Caixa: *${fechoCaixa.alias}*`;

    // --- STEP 6: COPY TO CLIPBOARD ---
    const el = document.createElement('textarea');
    el.value = b;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("✅ Briefing Copiado com Sucesso!");
}
