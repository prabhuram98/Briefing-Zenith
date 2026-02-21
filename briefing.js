/** Zenith Manager v1.8 - briefing.js **/

window.generateBriefing = function() {
    const date = document.getElementById('dateSelect').value;
    const staff = window.scheduleData[date] || [];
    if (!staff.length) return alert("No data.");

    const barTeam = staff.filter(s => s.area.toLowerCase() === 'bar');
    const salaTeam = staff.filter(s => s.area.toLowerCase() === 'sala');

    let b = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
    
    // Logic: Bar
    b += `BAR:\n`;
    if(barTeam[0]) b += `Bar A: *${barTeam[0].alias}* (${barTeam[0].shiftRaw})\n`;
    if(barTeam[1]) b += `Bar B: *${barTeam[1].alias}* (${barTeam[1].shiftRaw})\n`;

    b += `\nSELLERS:\n`;
    if(salaTeam[0]) b += `Seller A: *${salaTeam[0].alias}*\n`;
    if(salaTeam[1]) b += `Seller B: *${salaTeam[1].alias}*\n`;

    document.getElementById('briefingTextContainer').innerText = b;
    document.getElementById('briefingModal').style.display = 'flex';
};

window.copyBriefingText = function() {
    navigator.clipboard.writeText(document.getElementById('briefingTextContainer').innerText);
    alert("Copied!");
};

window.closeBriefingModal = function() {
    document.getElementById('briefingModal').style.display = 'none';
};
