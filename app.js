// app.js

// Example JSON data structure
const data = {
  "06/02/2026": [
    { name: "Ana", area: "Sala", entry: "07:30", exit: "16:00" },
    { name: "Prabhu", area: "Sala", entry: "08:00", exit: "16:30" },
    { name: "David", area: "Sala", entry: "09:00", exit: "17:30" },
    { name: "Carlos", area: "Bar", entry: "09:00", exit: "17:30" },
    { name: "Carol", area: "Bar", entry: "10:30", exit: "15:00" }
    // Add Leonor here if needed
  ],
  "07/02/2026": [
    { name: "Ana", area: "Sala", entry: "07:30", exit: "16:00" },
    { name: "Prabhu", area: "Sala", entry: "08:00", exit: "16:30" },
    { name: "David", area: "Sala", entry: "09:00", exit: "17:30" },
    { name: "Carlos", area: "Bar", entry: "09:00", exit: "17:30" },
    { name: "Carol", area: "Bar", entry: "10:30", exit: "15:00" },
    { name: "Leonor", area: "Bar", entry: "07:30", exit: "16:00" }
  ]
};

// Populate date dropdown
const dateSelect = document.getElementById("dateSelect");
Object.keys(data).forEach(date => {
  const opt = document.createElement("option");
  opt.value = date;
  opt.textContent = date;
  dateSelect.appendChild(opt);
});

// Utility: sort by entry/exit
function sortByTime(arr, key) {
  return [...arr].sort((a,b) => a[key].localeCompare(b[key]));
}

// Generate briefing
function generateBriefing(date) {
  const dayData = data[date];
  if (!dayData) return "No data for this date";

  const sala = dayData.filter(d => d.area === "Sala");
  const bar = dayData.filter(d => d.area === "Bar");

  // ------------------- PORTA -------------------
  let portaStaff = sala.find(s => s.name.toLowerCase() === "ana");
  if (!portaStaff) {
    portaStaff = sortByTime(sala, "entry")[0];
  }

  // ------------------- BAR -------------------
  const barSortedExit = sortByTime(bar, "exit");
  const barSortedEntry = sortByTime(bar, "entry");
  let barLines = [];

  if (barSortedEntry.length >=1) barLines.push(`${barSortedEntry[0].entry} Abertura Sala/Bar: ${barSortedEntry[0].name}`);
  if (barSortedEntry.length >=1) barLines.push(`${barSortedEntry[0].entry} Bar A: ${barSortedEntry[0].name}`);
  if (barSortedEntry.length >=3) {
    barLines.push(`${barSortedEntry[1].entry} Bar B: ${barSortedEntry[1].name}`);
  } else if (barSortedEntry.length ===2) {
    barLines.push(`${barSortedEntry[0].entry} Bar B: ${barSortedEntry[0].name}`);
  }
  if (barSortedEntry.length >=3) barLines.push(`${barSortedEntry[2].entry} Bar C: ${barSortedEntry[2].name}`);
  if (barSortedEntry.length >=4) barLines.push(`${barSortedEntry[3].entry} Bar D: ${barSortedEntry[3].name}`);

  // ------------------- SELLERS / RUNNER -------------------
  let salaExclAna = sala.filter(s => s.name.toLowerCase() !== "ana");
  const julieta = salaExclAna.find(s => s.name.toLowerCase() === "julieta");
  const otherSala = salaExclAna.filter(s => !julieta || s.name !== julieta.name);

  let sellers = [];
  let runnerLine = "";

  if (salaExclAna.length >=3 && julieta) {
    sellers = sortByTime(otherSala, "entry");
    runnerLine = `Runner A e B: Julieta`;
  } else {
    sellers = sortByTime(salaExclAna, "entry");
    runnerLine = `Runner A e B: Todos`;
  }

  const sellerLines = sellers.map((s, idx) => `${s.entry} Seller ${String.fromCharCode(65+idx)}: ${s.name}`);

  // ------------------- HACCP BAR -------------------
  let barHACCP = sortByTime(bar, "exit");
  let barHACCPLines = [];
  if (barHACCP.length >=1) {
    barHACCPLines.push(`${barHACCP[0].exit} Preparações Bar: ${barHACCP[0].name}`);
    if (barHACCP.length ===2) {
      barHACCPLines.push(`${barHACCP[0].exit} Reposição Bar: ${barHACCP[0].name}`);
    } else if (barHACCP.length >=3) {
      barHACCPLines.push(`${barHACCP[1].exit} Reposição Bar: ${barHACCP[1].name}`);
    }
    barHACCPLines.push(`${barHACCP[barHACCP.length-1].exit} Limpeza Máquina de Café / Reposição de Leites: ${barHACCP[barHACCP.length-1].name}`);
    barHACCPLines.push(`${barHACCP[barHACCP.length-1].exit} Fecho Bar: ${barHACCP[barHACCP.length-1].name}`);
  }

  // ------------------- HACCP SALA -------------------
  const salaSortedExit = sortByTime(salaExclAna, "exit");
  let salaHACCPLines = [];

  if (salaSortedExit.length ===1) {
    const s = salaSortedExit[0];
    salaHACCPLines.push(`${s.exit} Fecho da sala de cima: ${s.name}`);
    salaHACCPLines.push(`${s.exit} Limpeza e reposição aparador/ cadeira de bebés: ${s.name}`);
    salaHACCPLines.push(`${s.exit} Repor papel (casa de banho): ${s.name}`);
    salaHACCPLines.push(`${s.exit} Limpeza casa de banho (clientes e staff): ${s.name}`);
    salaHACCPLines.push(`${s.exit} Limpeza vidros e Espelhos: ${s.name}`);
    salaHACCPLines.push(`${s.exit} Fecho da sala: ${s.name}`);
  } else if (salaSortedExit.length ===2) {
    const first = salaSortedExit[0];
    const last = salaSortedExit[1];
    salaHACCPLines.push(`${first.exit} Fecho da sala de cima: ${first.name}`);
    salaHACCPLines.push(`${first.exit} Limpeza e reposição aparador/ cadeira de bebés: ${first.name}`);
    salaHACCPLines.push(`${first.exit} Repor papel (casa de banho): ${first.name}`);
    salaHACCPLines.push(`${first.exit} Limpeza casa de banho (clientes e staff): ${first.name}`);
    salaHACCPLines.push(`${last.exit} Limpeza vidros e Espelhos: ${last.name}`);
    salaHACCPLines.push(`${last.exit} Fecho da sala: ${last.name}`);
  } else if (salaSortedExit.length >=3) {
    const first = salaSortedExit[0];
    const second = salaSortedExit[1];
    const last = salaSortedExit[salaSortedExit.length-1];
    salaHACCPLines.push(`${first.exit} Fecho da sala de cima: ${first.name}`);
    salaHACCPLines.push(`${first.exit} Limpeza e reposição aparador/ cadeira de bebés: ${first.name}`);
    salaHACCPLines.push(`${first.exit} Repor papel (casa de banho): ${first.name}`);
    salaHACCPLines.push(`${second.exit} Limpeza casa de banho (clientes e staff): ${second.name}`);
    salaHACCPLines.push(`${last.exit} Limpeza vidros e Espelhos: ${last.name}`);
    salaHACCPLines.push(`${last.exit} Fecho da sala: ${last.name}`);
  }

  // ------------------- Fecho de Caixa -------------------
  const fechoPriority = ["carlos","prabhu","ana"];
  let fechoPerson = fechoPriority.find(p => bar.some(b => b.name.toLowerCase() === p));
  if (!fechoPerson) fechoPerson = barHACCP[barHACCP.length-1].name;
  const lastBarExit = barHACCP[barHACCP.length-1].exit;
  const fechoLine = `${lastBarExit} Fecho de Caixa: ${fechoPerson.charAt(0).toUpperCase()+fechoPerson.slice(1)}`;

  // ------------------- Compose Briefing -------------------
  let briefing = `Bom dia a todos!\n\n*BRIEFING ${date}*\n\n`;
  briefing += `${portaStaff.entry} Porta: ${portaStaff.name}\n\n`;
  briefing += `BAR:\n${barLines.join("\n")}\n\n⸻⸻⸻⸻\n\n`;
  briefing += `‼️ Loiça é responsabilidade de todos.\nNÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO\n——————————————\n\n`;
  briefing += `SELLERS:\n${sellerLines.join("\n")}\n\n${runnerLine}\n\n`;
  briefing += `⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n——————————————\nSeller A: Mesas 20 - 30\nSeller B & C: Mesas 1 - 12\n——————————————\n\n`;
  briefing += `HACCP / LIMPEZA BAR:\n${barHACCPLines.join("\n")}\n\n`;
  briefing += `HACCP / SALA:\n${salaHACCPLines.join("\n")}\n\n`;
  briefing += `${fechoLine}`;

  return briefing;
}

// ------------------- EVENT LISTENERS -------------------
const generateBtn = document.getElementById("generateBtn");
const briefingPopup = document.getElementById("briefingPopup");
const briefingText = document.getElementById("briefingText");
const closeBtn = document.getElementById("closeBtn");
const copyBtn = document.getElementById("copyBtn");

generateBtn.addEventListener("click", () => {
  const date = dateSelect.value;
  const briefing = generateBriefing(date);
  briefingText.textContent = briefing;
  briefingPopup.style.display = "flex";
});

closeBtn.addEventListener("click", () => {
  briefingPopup.style.display = "none";
});

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(briefingText.textContent);
  alert("Briefing copied!");
});
