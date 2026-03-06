/**
 * BRIEFING GENERATOR - VERSION 1.8.3
 * Fixed: Console logging added for debugging.
 */

function showBriefingModal(text) {
    let modal = document.getElementById('briefingModal');
    if (modal) modal.remove();
    
    modal = document.createElement('div');
    modal.id = 'briefingModal';
    Object.assign(modal.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: '1000', fontFamily: 'sans-serif' });
    
    const box = document.createElement('div');
    Object.assign(box.style, { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '80%', overflowY: 'auto', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' });
    
    const textArea = document.createElement('pre');
    Object.assign(textArea.style, { whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '14px', backgroundColor: '#f4f4f4', padding: '10px' });
    textArea.innerText = text;
    box.appendChild(textArea);
    
    const closeBtn = document.createElement('button');
    closeBtn.innerText = "Close";
    closeBtn.onclick = () => modal.remove();
    box.appendChild(closeBtn);
    
    modal.appendChild(box);
    document.body.appendChild(modal);
}

function generateBriefing() {
    console.log("Generate button clicked!"); // Debug: Check console to see if this appears
    
    const dateSelect = document.getElementById('dateSelect');
    if (!dateSelect) { console.error("Element 'dateSelect' not found!"); return; }
    
    const selectedDate = dateSelect.value;
    const dayStaff = scheduleData[selectedDate];
    
    if (!dayStaff) { alert("No schedule data found for: " + selectedDate); return; }

    // Helper functions
    const getEntry = (s) => (s && s.shiftRaw ? s.shiftRaw.split('-')[0].trim() : "00:00");
    const getExit = (s) => (s && s.shiftRaw ? s.shiftRaw.split('-')[1].trim() : "00:00");
    const parseMin = (t) => { const p = t.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); };
    
    const byExit = [...dayStaff].sort((a, b) => parseMin(getExit(a)) - parseMin(getExit(b)));
    const runners = dayStaff.filter(s => s.position.toLowerCase().includes('runner'));
    const fechoCaixa = dayStaff.find(s => s.position.toLowerCase().includes('head')) || dayStaff.find(s => s.position.toLowerCase().includes('manager')) || { alias: "---" };

    // ... (All your template strings here)
    let b = `Segue o briefing para hoje.\nBom dia equipa \n\nBRIEFING ${selectedDate}\n\n`;
    // ... [Add the rest of your template string mapping]

    showBriefingModal(b);
}
