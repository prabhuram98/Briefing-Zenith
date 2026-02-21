function generateBriefing() {
    const date = document.getElementById('briefingDate').value;
    const workers = window.zenithData.schedule[date] || [];
    const staffDir = window.zenithData.staff;

    if(!workers.length) return alert("No data");

    const bar = workers.filter(w => (staffDir[w.id]?.area || '').toLowerCase() === 'bar');
    const sala = workers.filter(w => (staffDir[w.id]?.area || '').toLowerCase() === 'sala');
    const manager = workers.find(w => (staffDir[w.id]?.pos || '').toLowerCase().includes('manager')) || sala[0];

    let t = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
    if(manager) t += `${manager.shift.split('-')[0]} Porta: *${staffDir[manager.id]?.alias || manager.id}*\n\n`;

    t += `BAR:\n`;
    if(bar[0]) t += `08:00 Bar A (Bebidas): *${staffDir[bar[0].id]?.alias || bar[0].id}*\n`;
    if(bar[1]) t += `08:30 Bar B (Cafés): *${staffDir[bar[1].id]?.alias || bar[1].id}*\n`;
    
    t += `\n⸻⸻⸻⸻\n\nSELLERS:\n`;
    sala.filter(s => s.id !== manager?.id).forEach((s, i) => {
        t += `${s.shift.split('-')[0]} Seller ${String.fromCharCode(65+i)}: *${staffDir[s.id]?.alias || s.id}*\n`;
    });

    t += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\nSeller A: Mesas 20-30\nSeller B & C: Mesas 1-12\nSeller C: Mesas 40-57\n——————————————\n\nHACCP / LIMPEZA:\n`;
    if(bar.length) t += `${bar[bar.length-1].shift.split('-')[1]} Fecho Bar: *${staffDir[bar[bar.length-1].id]?.alias}*\n`;
    if(sala.length) t += `${sala[sala.length-1].shift.split('-')[1]} Fecho Sala: *${staffDir[sala[sala.length-1].id]?.alias}*\n`;

    document.getElementById('briefingOutput').innerText = t;
    document.getElementById('briefingModal').style.display = 'flex';
}

function copyBriefing() {
    navigator.clipboard.writeText(document.getElementById('briefingOutput').innerText);
    alert("Copied!");
}

function closeModal() { document.getElementById('briefingModal').style.display = 'none'; }
