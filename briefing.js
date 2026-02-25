function generateBriefing() {
    const date = document.getElementById('dateSelect').value;
    const workingStaff = scheduleData[date] || [];

    if (workingStaff.length === 0) return alert("No staff working on this date.");

    // 1. Separate staff strictly by Area and Position
    const barStaff = workingStaff.filter(s => (s.area || "").toLowerCase() === 'bar');
    const salaStaff = workingStaff.filter(s => (s.area || "").toLowerCase() === 'sala');
    const runnerStaff = workingStaff.filter(s => (s.position || "").toLowerCase() === 'runner');

    // 2. Identify specific roles based on entering order
    const opener = barStaff.length > 0 ? barStaff[0].alias : "Manager";
    const sellerA = salaStaff[0] ? salaStaff[0].alias : "---";
    const sellerB = salaStaff[1] ? salaStaff[1].alias : "---";
    const sellerC = salaStaff[2] ? salaStaff[2].alias : "---";
    
    // Runners logic: specific staff if available, else TODOS
    const runnerDisplay = runnerStaff.length > 0 
        ? runnerStaff.map(s => s.alias).join(' e ') 
        : "TODOS";

    // 3. HACCP Assignments (Bar Staff ONLY)
    const prepBar = barStaff[0] ? barStaff[0].alias : "---";
    const reposicaoBar = barStaff[1] ? barStaff[1].alias : (barStaff[0] ? barStaff[0].alias : "---");
    const limpezaCafe = barStaff.length > 0 ? barStaff[barStaff.length - 1].alias : "---";
    const fechoBar = barStaff.length > 0 ? barStaff[barStaff.length - 1].alias : "---";

    // 4. HACCP Assignments (Sala Staff ONLY)
    const lastSala = salaStaff.length > 0 ? salaStaff[salaStaff.length - 1].alias : "---";

    // --- CONSTRUCT EXACT TEMPLATE WITH EMOJIS ---
    let t = `*Abertura Sala/Bar*: ${opener}\n`;
    t += `________________________\n\n`;
    t += `SELLERS:\n\n`;
    t += `Seller A: ${sellerA}\n`;
    t += `Seller B: ${sellerB}\n\n`;
    t += `Seller A: Mesa 20-30\n`;
    t += `Seller B: Mesa 1-12\n`;
    t += `Seller C: ${sellerC} (Sala de cima)\n`;
    t += `——————————————\n`;
    t += `RUNNERS:\n`;
    t += `Runner A e B: ${runnerDisplay}\n`;
    t += `——————————————\n\n`;
    
    t += `HACCP/LIMPEZA BAR:\n`;
    t += `*Preparações Bar:* ${prepBar}\n\n`;
    t += `*Reposição Bar:* ${reposicaoBar}\n\n`;
    t += `*Limpeza Máquina de Café/Reposição de Leites:* ${limpezaCafe}\n\n`;
    t += `*Fecho Bar:* ${fechoBar}\n\n\n`;
    
    t += `HACCP/ :\n`;
    t += `*Limpeza da sala de cima: ${sellerC}\n`;
    t += `*Limpeza e reposição aparador/cadeira de bebés:* ${sellerA}\n`;
    t += `*Repor papel  (casa de banho):* ${sellerB}\n`;
    t += `*Limpeza de Espelhos e vidros:* ${sellerA}\n`;
    t += `*Limpeza da casa de banho clientes e staff):* ${sellerB}\n`;
    t += `*Fecho da sala:* ${lastSala}\n`;
    t += `*Fecho de Caixa*: ${lastSala}`;

    // Copy to clipboard
    navigator.clipboard.writeText(t).then(() => {
        alert("Briefing generated exactly to template and copied!");
    }).catch(err => {
        console.error('Error copying:', err);
        alert("Error copying briefing.");
    });
}
