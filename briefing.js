/**
 * BRIEFING GENERATOR - VERSION 1.8.3
 * Fixed: Added global window scope for function visibility.
 */

// Global scope check to ensure the function is visible to the button
window.generateBriefing = function() {
    console.log("Briefing function triggered.");

    const dateSelect = document.getElementById('dateSelect');
    if (!dateSelect) { alert("Error: Element 'dateSelect' not found."); return; }
    
    const selectedDate = dateSelect.value;
    const dayStaff = typeof scheduleData !== 'undefined' ? scheduleData[selectedDate] : null;

    if (!dayStaff || dayStaff.length === 0) { 
        alert("No schedule data found for: " + selectedDate); 
        return; 
    }

    const getEntry = (s) => (s && s.shiftRaw ? s.shiftRaw.split('-')[0].trim() : "00:00");
    const getExit = (s) => (s && s.shiftRaw ? s.shiftRaw.split('-')[1].trim() : "00:00");
    const parseMin = (t) => { const p = t.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); };
    
    // Sort by exit for HACCP logic
    const byExit = [...dayStaff].sort((a, b) => parseMin(getExit(a)) - parseMin(getExit(b)));
    
    const isManager = (s) => s.position.toLowerCase().includes('manager') && !s.position.toLowerCase().includes('bar');
    const isRunner = (s) => s.position.toLowerCase().includes('runner');
    const isHeadseller = (s) => s.position.toLowerCase().includes('head');

    const manager = dayStaff.find(isManager);
    const headS = dayStaff.find(isHeadseller);
    const barEntry = dayStaff.filter(s => s.area.toLowerCase() === 'bar');
    const sellersPool = dayStaff.filter(s => s.area.toLowerCase() === 'sala' && !isManager(s) && !isRunner(s));
    const runnersList = dayStaff.filter(isRunner);
    const barM = dayStaff.find(s => s.position.toLowerCase().includes('bar manager'));
    const fechoCaixa = headS || barM || manager || { alias: "---" };

    const portaPerson = manager || headS || sellersPool[0] || { alias: "---" };

    let b = `Segue o briefing para hoje.\nBom dia equipa \n\nBRIEFING ${selectedDate}\n\n`;
    b += `${getEntry(portaPerson)} *Porta*: ${portaPerson.alias}\n\n`;

    b += `BAR: \n`;
    barEntry.forEach((s, i) => { b += `${getEntry(s)} *Bar ${String.fromCharCode(65+i)}*: ${s.alias} *${s.position}*\n`; });

    b += `\n________________________\n‼️ *Loiça é responsabilidade de todos.*\n—————————————— \n\nSELLERS:\n`;
    sellersPool.forEach((s, i) => { b += `${getEntry(s)} Seller ${String.fromCharCode(65+i)}:* ${s.alias} *Seller*\n`; });

    b += `\n\n⚠Pastéis de Nata - Cada Seller em sua secção⚠\n——————————————\nSeller A: Mesa 20-28\nSeller B: Mesa 1-18\nSeller C: Sala de cima \n——————————————\n`;
    
    b += `RUNNERS:\n`;
    if (runnersList.length >= 2) {
        b += `${getEntry(runnersList[0])} *Runner A:* ${runnersList[0].alias}\n${getEntry(runnersList[1])} *Runner B:* ${runnersList[1].alias}\n`;
    } else {
        b += `${getEntry(runnersList[0] || {shiftRaw: "08:00"})} *Runner A e B:* ${runnersList[0] ? runnersList[0].alias : "TODOS"}\n`;
    }
    b += `\n——————————————\nRunner A:* Bebidas \nRunner B:* Comidas\n\n‼️Loiça é responsabilidade de todos!\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\n`;

    b += `HACCP/LIMPEZA BAR:\n16:00 Reposição Bar:* ${barEntry[0]?.alias || "---"}\n16:00 Limpeza Máquina de Café/Reposição de Leites:* ${barEntry[0]?.alias || "---"} \n17:30 Preparações Bar:* TODOS\n17:30 Fecho Bar:* ${barEntry[barEntry.length-1]?.alias || "---"} \n\n\n`;

    b += `HACCP/ SALA:\n`;
    const haccpPool = byExit.filter(s => s.area.toLowerCase() === 'sala' && s.alias !== fechoCaixa.alias);
    
    if (haccpPool[0]) {
        b += `${getExit(haccpPool[0])} Fecho da sala de cima:* ${haccpPool[0].alias}\n`;
        b += `${getExit(haccpPool[0])} Repor papel (casa de banho):* ${haccpPool[0].alias}\n`;
        b += `${getExit(haccpPool[0])} Limpeza e reposição aparador/cadeira de bebés :*${haccpPool[0].alias}\n`;
    }
    if (haccpPool[1]) b += `${getExit(haccpPool[1])} *Limpeza da casa de banho (clientes e staff):* ${haccpPool[1].alias}\n`;
    if (haccpPool[2]) b += `${getExit(haccpPool[2])} *Limpeza de Espelhos e vidros:* ${haccpPool[2].alias}\n`;
    
    const lastSala = haccpPool[haccpPool.length-1] || { alias: "---" };
    b += `${getExit(lastSala)} *Fecho da sala:* ${lastSala.alias}\n\n`;
    b += `17:30 *Fecho de Caixa*: ${fechoCaixa.alias}`;

    showBriefingModal(b);
};

// Modal Helper Function
function showBriefingModal(text) {
    let modal = document.getElementById('briefingModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'briefingModal';
    Object.assign(modal.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '9999' });
    const box = document.createElement('div');
    Object.assign(box.style, { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '80%', overflowY: 'auto' });
    const pre = document.createElement('pre');
    pre.innerText = text;
    box.appendChild(pre);
    const close = document.createElement('button');
    close.innerText = "Close";
    close.onclick = () => modal.remove();
    box.appendChild(close);
    modal.appendChild(box);
    document.body.appendChild(modal);
}
