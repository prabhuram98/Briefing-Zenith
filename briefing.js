/** Zenith v1.8 - Briefing Logic (Fixed Template) **/

window.generateBriefing = function() {
    const date = document.getElementById('briefingDate').value;
    const workers = window.zenithData.schedule[date] || [];
    const staffDir = window.zenithData.staff;

    if(!workers.length) return alert("No schedule data available for this date.");

    // Filter by Area - Strict Rule Application
    const bar = workers.filter(w => (staffDir[w.id]?.area || '').toLowerCase() === 'bar');
    const sala = workers.filter(w => (staffDir[w.id]?.area || '').toLowerCase() === 'sala');
    
    // Assign Roles
    const manager = workers.find(w => (staffDir[w.id]?.pos || '').toLowerCase().includes('manager')) || sala[0];
    const runners = workers.filter(w => (staffDir[w.id]?.pos || '').toLowerCase().includes('runner'));

    // --- TEMPLATE START ---
    let t = `Bom dia a todos!\n\n`;
    t += `*BRIEFING ${date}*\n\n`;
    
    // Porta
    if(manager) {
        const entryPorta = manager.shift.split('-')[0].trim();
        t += `${entryPorta} Porta: *${staffDir[manager.id]?.alias || manager.id}*\n\n`;
    }

    // Bar Section
    t += `BAR:\n`;
    if(bar[0]) t += `${bar[0].shift.split('-')[0].trim()} Bar A (Bebidas): *${staffDir[bar[0].id]?.alias}*\n`;
    if(bar[1]) t += `${bar[1].shift.split('-')[0].trim()} Bar B (Cafés): *${staffDir[bar[1].id]?.alias}*\n`;
    if(bar[2]) t += `${bar[2].shift.split('-')[0].trim()} Bar C: *${staffDir[bar[2].id]?.alias}*\n`;

    // Sellers Section
    t += `\n⸻⸻⸻⸻\n\n`;
    t += `‼️ Loiça é responsabilidade de todos.\n`;
    t += `NÃO DEIXAR LOIÇA ACUMULAR\n`;
    t += `——————————————\n\n`;
    t += `SELLERS:\n`;

    const sellers = sala.filter(s => s.id !== manager.id);
    sellers.forEach((s, i) => {
        const label = String.fromCharCode(65 + i); // A, B, C...
        const entryTime = s.shift.split('-')[0].trim();
        t += `${entryTime} Seller ${label}: *${staffDir[s.id]?.alias}*\n`;
    });

    // Runnes (if any)
    if(runners.length > 0) {
        t += `\nRUNNERS: ${runners.map(r => staffDir[r.id]?.alias).join(' & ')}\n`;
    }

    // Nata Rules
    t += `\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n`;
    t += `——————————————\n`;
    t += `Seller A: Mesas 20-30\n`;
    t += `Seller B & C: Mesas 1-12\n`;
    t += `Seller C: Mesas 40-57\n`;
    t += `——————————————\n\n`;

    // HACCP / Fecho
    t += `HACCP / LIMPEZA:\n`;
    
    if(bar.length) {
        const lastBar = [...bar].sort((a,b) => b.shift.localeCompare(a.shift))[0];
        const exitBar = lastBar.shift.split('-')[1].trim();
        t += `${exitBar} Fecho Bar: *${staffDir[lastBar.id]?.alias}*\n`;
    }
    
    const lastSala = [...sala].sort((a,b) => b.shift.localeCompare(a.shift))[0];
    if(lastSala) {
        const exitSala = lastSala.shift.split('-')[1].trim();
        t += `${exitSala} Fecho Sala: *${staffDir[lastSala.id]?.alias}*\n`;
    }

    // --- TEMPLATE END ---

    document.getElementById('briefingOutput').innerText = t;
    document.getElementById('briefingModal').style.display = 'flex';
}

window.copyBriefing = function() {
    const text = document.getElementById('briefingOutput').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Briefing copied to clipboard!");
    });
}

window.closeModal = function() {
    document.getElementById('briefingModal').style.display = 'none';
}
