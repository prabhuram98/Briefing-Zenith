/**
 * BRIEFING GENERATOR - VERSION 1.8.3
 * Rules:
 * 1. Manager is strictly for Abertura Porta (No Sala HACCP).
 * 2. Bar HACCP tasks must show specific staff, not "TODOS".
 * 3. Copy/Close buttons must function as originally built.
 */

window.generateBriefing = function() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayStaff = typeof scheduleData !== 'undefined' ? scheduleData[selectedDate] : null;

    if (!dayStaff || dayStaff.length === 0) { alert("Data missing"); return; }

    const getEntry = (s) => (s && s.shiftRaw ? s.shiftRaw.split('-')[0].trim() : "00:00");
    const getExit = (s) => (s && s.shiftRaw ? s.shiftRaw.split('-')[1].trim() : "00:00");
    const parseMin = (t) => { const p = t.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); };
    
    // Filters
    const isManager = (s) => s.position.toLowerCase().includes('manager') && !s.position.toLowerCase().includes('bar');
    const isRunner = (s) => s.position.toLowerCase().includes('runner');
    const isHeadseller = (s) => s.position.toLowerCase().includes('head');

    const manager = dayStaff.find(isManager);
    const headS = dayStaff.find(isHeadseller);
    const barEntry = dayStaff.filter(s => s.area.toLowerCase() === 'bar');
    const runnersList = dayStaff.filter(isRunner);
    const sellersPool = dayStaff.filter(s => s.area.toLowerCase() === 'sala' && !isManager(s) && !isRunner(s));
    
    // Logic Rules
    const portaPerson = manager || headS || sellersPool[0];
    const fechoCaixa = headS || dayStaff.find(s => s.position.toLowerCase().includes('bar manager')) || manager;
    const haccpPool = dayStaff.filter(s => s.area.toLowerCase() === 'sala' && s.alias !== fechoCaixa.alias && s.alias !== manager?.alias).sort((a,b) => parseMin(getExit(a)) - parseMin(getExit(b)));

    let b = `Segue o briefing para hoje.\nBom dia equipa \n\nBRIEFING ${selectedDate}\n\n`;
    b += `${getEntry(portaPerson)} *Porta*: ${portaPerson.alias}\n\n`;
    
    b += `BAR: \n`;
    barEntry.forEach((s, i) => { b += `${getEntry(s)} *Bar ${String.fromCharCode(65+i)}*: ${s.alias} *${s.position}*\n`; });

    b += `\n________________________\n‼️ *Loiça é responsabilidade de todos.*\n—————————————— \n\nSELLERS:\n`;
    sellersPool.forEach((s, i) => { b += `${getEntry(s)} Seller ${String.fromCharCode(65+i)}:* ${s.alias} *Seller*\n`; });

    b += `\n\n⚠Pastéis de Nata - Cada Seller em sua secção⚠\n——————————————\nSeller A: Mesa 20-28\nSeller B: Mesa 1-18\nSeller C: Sala de cima \n——————————————\n`;
    b += `RUNNERS:\n${getEntry(runnersList[0])} *Runner A:* ${runnersList[0]?.alias || "---"}\n${getEntry(runnersList[1])} *Runner B:* ${runnersList[1]?.alias || "---"}\n——————————————\nRunner A:* Bebidas \nRunner B:* Comidas\n\n‼️Loiça é responsabilidade de todos!\n——————————————\n\n`;

    b += `HACCP/LIMPEZA BAR:\n16:00 Reposição Bar:* ${barEntry[0]?.alias}\n16:00 Limpeza Máquina de Café/Reposição de Leites:* ${barEntry[0]?.alias} \n17:30 Preparações Bar:* ${barEntry[barEntry.length-1]?.alias}\n17:30 Fecho Bar:* ${barEntry[barEntry.length-1]?.alias} \n\n\n`;

    b += `HACCP/ SALA:\n`;
    if(haccpPool[0]) {
        b += `${getExit(haccpPool[0])} Fecho da sala de cima:* ${haccpPool[0].alias}\n`;
        b += `${getExit(haccpPool[0])} Repor papel (casa de banho):* ${haccpPool[0].alias}\n`;
        b += `${getExit(haccpPool[0])} Limpeza e reposição aparador/cadeira de bebés :*${haccpPool[0].alias}\n`;
        b += `${getExit(haccpPool[0])} *Limpeza da casa de banho (clientes e staff):* ${haccpPool[0].alias}\n`;
    }
    b += `${getExit(haccpPool[1] || haccpPool[0])} *Limpeza de Espelhos e vidros:* ${haccpPool[1]?.alias || haccpPool[0]?.alias}\n`;
    b += `${getExit(haccpPool[haccpPool.length-1])} *Fecho da sala:* ${haccpPool[haccpPool.length-1].alias}\n\n`;
    b += `17:30 *Fecho de Caixa*: ${fechoCaixa.alias}`;

    showBriefingModal(b);
};

function showBriefingModal(text) {
    let modal = document.getElementById('briefingModal') || document.createElement('div');
    modal.id = 'briefingModal';
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:9999;";
    
    const box = document.createElement('div');
    box.style.cssText = "background:#fff; padding:20px; border-radius:8px; width:90%; max-width:500px; max-height:80%; overflow-y:auto;";
    
    const pre = document.createElement('pre');
    pre.innerText = text;
    box.appendChild(pre);
    
    const copyBtn = document.createElement('button');
    copyBtn.innerText = "Copy Briefing";
    copyBtn.style.marginRight = "10px";
    copyBtn.onclick = () => navigator.clipboard.writeText(text).then(() => alert("Copied!"));
    
    const closeBtn = document.createElement('button');
    closeBtn.innerText = "Close";
    closeBtn.onclick = () => modal.remove();
    
    box.appendChild(copyBtn);
    box.appendChild(closeBtn);
    modal.appendChild(box);
    document.body.appendChild(modal);
}
