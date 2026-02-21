window.generateBriefing = function() {
    const date = document.getElementById('dateSelect').value;
    const staff = window.scheduleData[date] || [];
    
    // Logic: Bar staff for Bar tasks, Sala for Sala
    const bar = staff.filter(s => s.area.toLowerCase() === 'bar');
    const sala = staff.filter(s => s.area.toLowerCase() === 'sala');
    const manager = staff.find(s => s.position?.toLowerCase().includes('manager')) || sala[0];

    let b = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
    if(manager) b += `${manager.shiftRaw.split('-')[0]} Porta: **${manager.alias}**\n\n`;

    b += `BAR:\n`;
    if(bar[0]) b += `08:00 Abertura Sala/Bar: *${bar[0].alias}*\n`;
    if(bar[0]) b += `08:00 Bar A (Bebidas): *${bar[0].alias}*\n`;
    if(bar[1]) b += `08:30 Bar B (Cafés/Caixa): *${bar[1].alias}*\n`;

    b += `\n⸻⸻⸻⸻\n\n‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR\n——————————————\n\nSELLERS:\n`;
    const sellers = sala.filter(s => s !== manager);
    sellers.forEach((s, i) => {
        const label = String.fromCharCode(65 + i); // Seller A, B, C
        b += `${s.shiftRaw.split('-')[0]} Seller ${label}: *${s.alias}*\n`;
    });

    b += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n`;
    b += `——————————————\n`;
    b += `Seller A: Mesas 20-30\n`;
    b += `Seller B & C: Mesas 1-12\n`;
    b += `Seller C: Mesas 40-57\n`;
    b += `——————————————\n\nHACCP / LIMPEZA:\n`;
    
    if(bar[bar.length-1]) b += `${bar[bar.length-1].shiftRaw.split('-')[1]} Fecho Bar: *${bar[bar.length-1].alias}*\n`;
    if(sala[sala.length-1]) b += `${sala[sala.length-1].shiftRaw.split('-')[1]} Fecho Sala: *${sala[sala.length-1].alias}*\n`;

    document.getElementById('briefingTextContainer').innerText = b;
    document.getElementById('briefingModal').style.display = 'flex';
};
