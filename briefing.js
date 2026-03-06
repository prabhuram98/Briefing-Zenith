/**
 * BRIEFING GENERATOR - VERSION 1.8.3
 * Logic:
 * - Runners A & B: Split if 2+ present.
 * - HACCP: Runners are included in the pool and assigned tasks based on exit time.
 * - One staff member per task.
 */

// 1. MODAL FUNCTION
function showBriefingModal(text) {
    const existing = document.getElementById('briefingModal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'briefingModal';
    Object.assign(modal.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', fontFamily: 'sans-serif' });
    
    const box = document.createElement('div');
    Object.assign(box.style, { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '80%', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', position: 'relative' });
    
    const textArea = document.createElement('pre');
    Object.assign(textArea.style, { whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '14px', backgroundColor: '#f4f4f4', padding: '10px', borderRadius: '4px' });
    textArea.innerText = text;
    box.appendChild(textArea);
    
    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, { display: 'flex', justifyContent: 'space-between', marginTop: '20px' });
    
    const copyBtn = document.createElement('button');
    copyBtn.innerText = "Copy Briefing";
    Object.assign(copyBtn.style, { padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' });
    
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.innerText = "COPIED!";
            copyBtn.style.backgroundColor = "#218838";
            setTimeout(() => {
                copyBtn.innerText = "Copy Briefing";
                copyBtn.style.backgroundColor = "#28a745";
            }, 2000);
        });
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.innerText = "Close";
    Object.assign(closeBtn.style, { padding: '10px 20px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' });
    closeBtn.onclick = () => { modal.remove(); };
    
    btnContainer.appendChild(copyBtn);
    btnContainer.appendChild(closeBtn);
    box.appendChild(btnContainer);
    modal.appendChild(box);
    document.body.appendChild(modal);
}

// 2. GENERATOR FUNCTION
function generateBriefing() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayStaff = scheduleData[selectedDate];

    if (!dayStaff || dayStaff.length === 0) { alert("No data for date: " + selectedDate); return; }

    const getEntry = (s) => (s && s.shiftRaw && s.shiftRaw.includes('-')) ? s.shiftRaw.split('-')[0].trim() : "00:00";
    const getExit = (s) => (s && s.shiftRaw && s.shiftRaw.includes('-')) ? s.shiftRaw.split('-')[1].trim() : "00:00";
    const parseMin = (t) => { const p = t.split(':'); return p.length < 2 ? 0 : parseInt(p[0]) * 60 + parseInt(p[1]); };
    
    const byEntry = [...dayStaff].sort((a, b) => parseMin(getEntry(a)) - parseMin(getEntry(b)));
    const byExit = [...dayStaff].sort((a, b) => parseMin(getExit(a)) - parseMin(getExit(b)));

    const isManager = (s) => s.position.toLowerCase().includes('manager') && !s.position.toLowerCase().includes('bar');
    const isBar = (s) => s.area.toLowerCase() === 'bar';
    const isRunner = (s) => s.position.toLowerCase().includes('runner');
    const isHeadseller = (s) => s.position.toLowerCase().includes('head');

    const manager = dayStaff.find(isManager);
    const headS = dayStaff.find(isHeadseller);
    const barEntry = byEntry.filter(isBar);
    const barExit = byExit.filter(isBar);
    const sellersPool = byEntry.filter(s => s.area.toLowerCase() === 'sala' && !isManager(s) && !isRunner(s));
    const runnersList = byEntry.filter(isRunner);
    
    // Pool for HACCP assignments (Sellers + Runners)
    const salaExitPool = byExit.filter(s => s.area.toLowerCase() === 'sala' && !isManager(s));

    const portaPerson = manager || headS || sellersPool[0];
    const barM = dayStaff.find(s => s.position.toLowerCase().includes('bar manager'));
    const fechoCaixa = headS || barM || manager || { alias: "---" };

    let b = `Segue o briefing para hoje.\nBom dia equipa \n\nBRIEFING ${selectedDate}\n\n`;
    b += `${getEntry(portaPerson)} *Porta*: ${portaPerson.alias}\n\n`;

    b += `BAR: \n`;
    if (barEntry[0]) { b += `${getEntry(barEntry[0])} *Abertura Sala/Bar*: ${barEntry[0].alias}\n`; b += `${getEntry(barEntry[0])} *Bar A: ${barEntry[0].alias} * Barista - Caixa/Bebidas*\n`; }
    if (barEntry[1]) b += `${getEntry(barEntry[1])} *Bar B: ${barEntry[1].alias} * Barista - Bebidas /Smoothies\n`;
    if (barEntry[2]) b += `${getEntry(barEntry[2])} *Bar C: ${barEntry[2].alias} * Barista - Bebidas /Smoothies\n`;
    if (barEntry[3]) b += `${getEntry(barEntry[3])} *Bar D: ${barEntry[3].alias} * Barista- Cafés\n`;

    b += `\n________________________\n‼️ *Loiça é responsabilidade de todos.*\n—————————————— \n\nSELLERS:\n`;
    sellersPool.forEach((s, i) => { if(i < 3) b += `${getEntry(s)} Seller ${String.fromCharCode(65+i)}: ${s.alias} *${isHeadseller(s) ? "Headseller" : "Seller"}*\n`; });

    b += `\n\n⚠Pastéis de Nata - Cada Seller na sua secção⚠\n——————————————\nSeller A: Mesa 20-30\nSeller B: Mesa 1-12\nSeller C: Sala de cima \n——————————————\n`;
    
    // Runner section
    b += `RUNNERS:\n`;
    if (runnersList.length >= 2) {
        b += `${getEntry(runnersList[0])} *Runner A:* ${runnersList[0].alias}\n`;
        b += `${getEntry(runnersList[1])} *Runner B:* ${runnersList[1].alias}\n`;
    } else if (runnersList.length === 1) {
        b += `${getEntry(runnersList[0])} *Runner A:* ${runnersList[0].alias}\n`;
    } else {
        b += `08:00 *Runner A e B:* TODOS\n`;
    }
    b += `——————————————\n\n`;

    b += `‼️Loiça é responsabilidade de todos!\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\n`;

    b += `HACCP/LIMPEZA BAR:\n`;
    if (barExit.length > 0) {
        const b0 = barExit[0];
        const bL = barExit[barExit.length - 1];
        b += `${getExit(b0)} Preparações Bar:* ${b0.alias}\n`;
        b += `${getExit(bL)} Fecho Bar:* ${bL.alias}\n\n`;
    }

    b += `HACCP/ SALA:\n`;
    
    // Assign top 3 tasks to the first person to leave in the Sala pool (Runner or Seller)
    const firstExit = salaExitPool[0];
    if (firstExit) {
        b += `${getExit(firstExit)} *Limpeza da sala de cima:* ${firstExit.alias}\n`;
        b += `${getExit(firstExit)} *Limpeza e reposição aparador/cadeira de bebés:* ${firstExit.alias}\n`;
        b += `${getExit(firstExit)} *Repor papel (casa de banho):* ${firstExit.alias}\n`;
    }

    // Filter out the first person and the cashier closer to find the next staff members leaving
    const remainingHaccpPool = salaExitPool.filter(s => s.alias !== fechoCaixa.alias && s.alias !== (firstExit ? firstExit.alias : ''));

    // Assignment for next person (could be Runner B or another Seller)
    const secondExit = remainingHaccpPool[0];
    if (secondExit) {
        b += `${getExit(secondExit)} *Limpeza de Espelhos e vidros:* ${secondExit.alias}\n`;
    }

    // Assignment for next person (next in line for bathroom)
    const thirdExit = remainingHaccpPool[1] || secondExit || firstExit;
    if (thirdExit) {
        b += `${getExit(thirdExit)} *Limpeza da casa de banho (clientes e staff):* ${thirdExit.alias}\n`;
    }
    
    const lastSeller = salaExitPool[salaExitPool.length - 1];
    b += `${getExit(lastSeller)} *Fecho da sala:* ${lastSeller.alias}\n\n`;
    b += `${getExit(fechoCaixa)} *Fecho de Caixa*: ${fechoCaixa.alias}`;

    showBriefingModal(b);
}
