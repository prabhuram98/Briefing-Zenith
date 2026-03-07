/**
 * BRIEFING GENERATOR - VERSION 1.8.3
 * Fixed: Styling, Copy/Close colors, and Sequential HACCP distribution.
 */

window.generateBriefing = function() {
    const selectedDate = document.getElementById('dateSelect').value;
    const dayStaff = typeof scheduleData !== 'undefined' ? scheduleData[selectedDate] : null;

    if (!dayStaff || dayStaff.length === 0) { alert("Data missing"); return; }

    const getEntry = (s) => (s && s.shiftRaw ? s.shiftRaw.split('-')[0].trim() : "00:00");
    const getExit = (s) => (s && s.shiftRaw ? s.shiftRaw.split('-')[1].trim() : "00:00");
    const parseMin = (t) => { const p = t.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); };
    
    // Logic: Sort by exit time to distribute tasks
    const haccpPool = dayStaff
        .filter(s => s.area.toLowerCase() === 'sala' && !s.position.toLowerCase().includes('manager'))
        .sort((a,b) => parseMin(getExit(a)) - parseMin(getExit(b)));

    const isManager = (s) => s.position.toLowerCase().includes('manager') && !s.position.toLowerCase().includes('bar');
    const isRunner = (s) => s.position.toLowerCase().includes('runner');
    const isHeadseller = (s) => s.position.toLowerCase().includes('head');

    const manager = dayStaff.find(isManager);
    const headS = dayStaff.find(isHeadseller);
    const barEntry = dayStaff.filter(s => s.area.toLowerCase() === 'bar');
    const runnersList = dayStaff.filter(isRunner);
    const sellersPool = dayStaff.filter(s => s.area.toLowerCase() === 'sala' && !isManager(s) && !isRunner(s));
    const fechoCaixa = headS || dayStaff.find(s => s.position.toLowerCase().includes('bar manager')) || manager;

    let b = `Segue o briefing para hoje.\nBom dia equipa \n\nBRIEFING ${selectedDate}\n\n`;
    b += `${getEntry(manager || headS)} *Porta*: ${(manager || headS)?.alias}\n\n`;
    
    b += `BAR: \n`;
    barEntry.forEach((s, i) => { b += `${getEntry(s)} *Bar ${String.fromCharCode(65+i)}*: ${s.alias} *${s.position}*\n`; });

    b += `\n________________________\n‼️ *Loiça é responsabilidade de todos.*\n—————————————— \n\nSELLERS:\n`;
    sellersPool.forEach((s, i) => { b += `${getEntry(s)} Seller ${String.fromCharCode(65+i)}:* ${s.alias} *Seller*\n`; });

    b += `\n\n⚠Pastéis de Nata - Cada Seller em sua secção⚠\n——————————————\nSeller A: Mesa 20-28\nSeller B: Mesa 1-18\nSeller C: Sala de cima \n——————————————\n`;
    b += `RUNNERS:\n${getEntry(runnersList[0])} *Runner A:* ${runnersList[0]?.alias || "---"}\n${getEntry(runnersList[1])} *Runner B:* ${runnersList[1]?.alias || "---"}\n——————————————\nRunner A:* Bebidas \nRunner B:* Comidas\n\n‼️Loiça é responsabilidade de todos!\n——————————————\n\n`;

    b += `HACCP/LIMPEZA BAR:\n16:00 Reposição Bar:* ${barEntry[0]?.alias}\n16:00 Limpeza Máquina de Café/Reposição de Leites:* ${barEntry[0]?.alias} \n17:30 Preparações Bar:* ${barEntry[barEntry.length-1]?.alias}\n17:30 Fecho Bar:* ${barEntry[barEntry.length-1]?.alias} \n\n\n`;

    b += `HACCP/ SALA:\n`;
    // Distributed Task Assignment
    if(haccpPool.length > 0) {
        b += `${getExit(haccpPool[0])} Fecho da sala de cima:* ${haccpPool[0].alias}\n`;
        b += `${getExit(haccpPool[0])} Repor papel (casa de banho):* ${haccpPool[0].alias}\n`;
    }
    if(haccpPool.length > 1) {
        b += `${getExit(haccpPool[1])} Limpeza e reposição aparador/cadeira de bebés :*${haccpPool[1].alias}\n`;
        b += `${getExit(haccpPool[1])} *Limpeza da casa de banho (clientes e staff):* ${haccpPool[1].alias}\n`;
    }
    if(haccpPool.length > 2) {
        b += `${getExit(haccpPool[2])} *Limpeza de Espelhos e vidros:* ${haccpPool[2].alias}\n`;
    }
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
    copyBtn.style.cssText = "padding:10px 20px; background-color:#28a745; color:#fff; border:none; border-radius:4px; cursor:pointer; margin-right:10px;";
    copyBtn.onclick = () => navigator.clipboard.writeText(text).then(() => { copyBtn.innerText = "COPIED!"; setTimeout(() => copyBtn.innerText = "Copy Briefing", 2000); });
    
    const closeBtn = document.createElement('button');
    closeBtn.innerText = "Close";
    closeBtn.style.cssText = "padding:10px 20px; background-color:#dc3545; color:#fff; border:none; border-radius:4px; cursor:pointer;";
    closeBtn.onclick = () => modal.remove();
    
    box.appendChild(copyBtn);
    box.appendChild(closeBtn);
    modal.appendChild(box);
    document.body.appendChild(modal);
}
