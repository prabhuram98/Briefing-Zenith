// app.js
const data = require('./data.json');

function roundTime(timeStr) {
    return timeStr; // keep HH:MM
}

function generateBriefing(date) {
    const dayData = data[date];
    if (!dayData) return "No data for this date";

    const { sala, bar } = dayData;

    // ------------------- PORTA -------------------
    let portaStaff = sala.find(s => s.name.toLowerCase() === 'ana');
    if (!portaStaff) {
        portaStaff = sala.reduce((earliest, s) => !earliest || s.entry < earliest.entry ? s : earliest, null);
    }

    // ------------------- BAR -------------------
    const barSorted = [...bar].sort((a,b) => a.entry.localeCompare(b.entry));
    let barLines = [];
    barLines.push(`${roundTime(barSorted[0].entry)} Abertura Sala/Bar: ${barSorted[0].name}`);
    if (barSorted[0]) barLines.push(`${roundTime(barSorted[0].entry)} Bar A: ${barSorted[0].name}`);
    if (barSorted[1]) barLines.push(`${roundTime(barSorted[1].entry)} Bar B: ${barSorted[1].name}`);
    if (barSorted[2]) barLines.push(`${roundTime(barSorted[2].entry)} Bar C: ${barSorted[2].name}`);
    if (barSorted[3]) barLines.push(`${roundTime(barSorted[3].entry)} Bar D: ${barSorted[3].name}`);

    // ------------------- SELLERS -------------------
    let salaStaffExclAna = sala.filter(s => s.name.toLowerCase() !== 'ana'); // Only Sala staff
    const julieta = salaStaffExclAna.find(s => s.name.toLowerCase() === 'julieta');
    const otherSala = salaStaffExclAna.filter(s => s.name.toLowerCase() !== 'julieta');

    let sellers = [];
    let runnerLine = '';

    if (salaStaffExclAna.length >= 3) {
        // 3+ Sala members → Julieta becomes Runner
        sellers = otherSala.sort((a,b)=>a.entry.localeCompare(b.entry));
        runnerLine = `Runner A e B: Julieta`;
    } else {
        // 1-2 Sala members → Julieta can be Seller
        sellers = salaStaffExclAna.sort((a,b)=>a.entry.localeCompare(b.entry));
        runnerLine = `Runner A e B: Todos`;
    }

    const sellerLines = sellers.map((s, idx) => `${roundTime(s.entry)} Seller ${String.fromCharCode(65+idx)}: ${s.name}`);

    // ------------------- HACCP BAR -------------------
    const barHACCP = [...bar].sort((a,b)=>a.exit.localeCompare(b.exit));
    let barHACCPLines = [];
    if (barHACCP[0]) barHACCPLines.push(`${roundTime(barHACCP[0].exit)} Preparações Bar: ${barHACCP[0].name}`);
    if (barHACCP[1]) barHACCPLines.push(`${roundTime(barHACCP[1].exit)} Reposição Bar: ${barHACCP[1].name}`);
    if (barHACCP.length >=3) barHACCPLines.push(`${roundTime(barHACCP[barHACCP.length-1].exit)} Limpeza Máquina de Café / Reposição de Leites: ${barHACCP[barHACCP.length-1].name}`);
    if (barHACCP.length >=2) barHACCPLines.push(`${roundTime(barHACCP[barHACCP.length-1].exit)} Fecho Bar: ${barHACCP[barHACCP.length-1].name}`);

    // ------------------- HACCP SALA -------------------
    const salaSortedByExit = [...salaStaffExclAna].sort((a,b)=>a.exit.localeCompare(b.exit)); // Only Sala staff
    let salaHACCPLines = [];

    if (salaSortedByExit.length === 1) {
        const s = salaSortedByExit[0];
        salaHACCPLines.push(`${roundTime(s.exit)} Fecho da sala de cima: ${s.name}`);
        salaHACCPLines.push(`${roundTime(s.exit)} Limpeza e reposição aparador/ cadeira de bebés: ${s.name}`);
        salaHACCPLines.push(`${roundTime(s.exit)} Repor papel (casa de banho): ${s.name}`);
        salaHACCPLines.push(`${roundTime(s.exit)} Limpeza casa de banho (clientes e staff): ${s.name}`);
        salaHACCPLines.push(`${roundTime(s.exit)} Limpeza vidros e Espelhos: ${s.name}`);
        salaHACCPLines.push(`${roundTime(s.exit)} Fecho da sala: ${s.name}`);
    } else if (salaSortedByExit.length === 2) {
        const first = salaSortedByExit[0];
        const last = salaSortedByExit[1];
        salaHACCPLines.push(`${roundTime(first.exit)} Fecho da sala de cima: ${first.name}`);
        salaHACCPLines.push(`${roundTime(first.exit)} Limpeza e reposição aparador/ cadeira de bebés: ${first.name}`);
        salaHACCPLines.push(`${roundTime(first.exit)} Repor papel (casa de banho): ${first.name}`);
        salaHACCPLines.push(`${roundTime(first.exit)} Limpeza casa de banho (clientes e staff): ${first.name}`);
        salaHACCPLines.push(`${roundTime(last.exit)} Limpeza vidros e Espelhos: ${last.name}`);
        salaHACCPLines.push(`${roundTime(last.exit)} Fecho da sala: ${last.name}`);
    } else if (salaSortedByExit.length >= 3) {
        const first = salaSortedByExit[0];
        const second = salaSortedByExit[1];
        const last = salaSortedByExit[salaSortedByExit.length-1];
        salaHACCPLines.push(`${roundTime(first.exit)} Fecho da sala de cima: ${first.name}`);
        salaHACCPLines.push(`${roundTime(first.exit)} Limpeza e reposição aparador/ cadeira de bebés: ${first.name}`);
        salaHACCPLines.push(`${roundTime(first.exit)} Repor papel (casa de banho): ${first.name}`);
        salaHACCPLines.push(`${roundTime(second.exit)} Limpeza casa de banho (clientes e staff): ${second.name}`);
        salaHACCPLines.push(`${roundTime(second.exit)} Limpeza vidros e Espelhos: ${second.name}`);
        salaHACCPLines.push(`${roundTime(last.exit)} Fecho da sala: ${last.name}`);
    }

    // ------------------- Fecho de Caixa -------------------
    const fechoPriority = ['carlos','prabhu','ana'];
    let fechoPerson = fechoPriority.find(p => bar.some(b => b.name.toLowerCase() === p));
    if (!fechoPerson) fechoPerson = barSorted[barSorted.length-1].name;
    const lastBarExit = barSorted[barSorted.length-1].exit;
    const fechoLine = `${roundTime(lastBarExit)} Fecho de Caixa: ${fechoPerson.charAt(0).toUpperCase()+fechoPerson.slice(1)}`;

    // ------------------- Compose Briefing -------------------
    let briefing = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
    briefing += `${roundTime(portaStaff.entry)} Porta: ${portaStaff.name}\n\n`;
    briefing += `BAR:\n${barLines.join('\n')}\n\n⸻⸻⸻⸻\n\n`;
    briefing += `‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\n`;
    briefing += `SELLERS:\n${sellerLines.join('\n')}\n\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\n`;
    briefing += `Seller A: Mesas 20 - 30\nSeller B & C: Mesas 1 - 12\n——————————————\n\n`;
    briefing += `${runnerLine}\n\n`;
    briefing += `HACCP / LIMPEZA BAR:\n${barHACCPLines.join('\n')}\n\n`;
    briefing += `HACCP / SALA:\n${salaHACCPLines.join('\n')}\n\n`;
    briefing += `${fechoLine}`;

    return briefing;
}

// Example
console.log(generateBriefing("06/02/2026"));