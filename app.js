function roundTime(t) { return t; }

// Populate dates
const dateSelect = document.getElementById("dateSelect");
Object.keys(data).forEach(d => {
  const opt = document.createElement("option");
  opt.value = d;
  opt.textContent = d;
  dateSelect.appendChild(opt);
});

function generateBriefing(date) {
  const dayData = data[date];
  if (!dayData) return "No data for this date";

  const { sala, bar } = dayData;

  // PORTA
  let portaStaff = sala.find(s => s.name.toLowerCase() === "ana")
    || sala.reduce((e,s)=>!e||s.entry<e.entry?s:e,null);

  // BAR
  const barSorted = [...bar].sort((a,b)=>a.entry.localeCompare(b.entry));
  let barLines = [];
  if (barSorted[0]) barLines.push(`${barSorted[0].entry} Abertura Sala/Bar: ${barSorted[0].name}`);
  if (barSorted[0]) barLines.push(`${barSorted[0].entry} Bar A: ${barSorted[0].name}`);
  if (barSorted[1]) barLines.push(`${barSorted[1].entry} Bar B: ${barSorted[1].name}`);
  if (barSorted[2]) barLines.push(`${barSorted[2].entry} Bar C: ${barSorted[2].name}`);

  // SELLERS
  const salaNoAna = sala.filter(s=>s.name.toLowerCase()!=="ana");
  const julieta = salaNoAna.find(s=>s.name.toLowerCase()==="julieta");
  const others = salaNoAna.filter(s=>s.name.toLowerCase()!=="julieta");

  let sellers=[], runnerLine="";
  if (salaNoAna.length>=3) {
    sellers = others.sort((a,b)=>a.entry.localeCompare(b.entry));
    runnerLine = "Runner A e B: Julieta";
  } else {
    sellers = salaNoAna.sort((a,b)=>a.entry.localeCompare(b.entry));
    runnerLine = "Runner A e B: Todos";
  }

  const sellerLines = sellers.map((s,i)=>`${s.entry} Seller ${String.fromCharCode(65+i)}: ${s.name}`);

  // HACCP BAR
  const barExit = [...bar].sort((a,b)=>a.exit.localeCompare(b.exit));
  let barH=[];
  if (barExit[0]) barH.push(`${barExit[0].exit} Preparações Bar: ${barExit[0].name}`);
  if (barExit[1]) barH.push(`${barExit[1].exit} Reposição Bar: ${barExit[1].name}`);
  if (barExit.length>=2) barH.push(`${barExit[barExit.length-1].exit} Fecho Bar: ${barExit[barExit.length-1].name}`);

  // HACCP SALA
  const salaExit = [...salaNoAna].sort((a,b)=>a.exit.localeCompare(b.exit));
  let salaH=[];
  if (salaExit[0]) {
    salaH.push(`${salaExit[0].exit} Fecho da sala: ${salaExit[salaExit.length-1].name}`);
  }

  // FECHO CAIXA
  const lastBar = barSorted[barSorted.length-1];
  const fechoLine = `${lastBar.exit} Fecho de Caixa: ${lastBar.name}`;

  let briefing = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
  briefing += `${portaStaff.entry} Porta: ${portaStaff.name}\n\n`;
  briefing += `BAR:\n${barLines.join("\n")}\n\n——————————————\n\n`;
  briefing += `SELLERS:\n${sellerLines.join("\n")}\n\n${runnerLine}\n\n`;
  briefing += `HACCP / BAR:\n${barH.join("\n")}\n\n`;
  briefing += `HACCP / SALA:\n${salaH.join("\n")}\n\n`;
  briefing += fechoLine;

  return briefing;
}

// Buttons
document.getElementById("generateBtn").onclick = () => {
  const d = dateSelect.value;
  document.getElementById("briefingText").textContent = generateBriefing(d);
  document.getElementById("briefingPopup").style.display = "flex";
};

document.getElementById("closeBtn").onclick = () => {
  document.getElementById("briefingPopup").style.display = "none";
};

document.getElementById("copyBtn").onclick = () => {
  navigator.clipboard.writeText(document.getElementById("briefingText").textContent);
};

