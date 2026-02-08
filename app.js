const SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSKuZ37JznuRBr5xNhzky3jZ83-3EoZVqjlHS8qXeGcU3J1mZ5K3tPS59FH90eSZxl65G9O8DwNmPrk/pub?output=csv";

let scheduleData = {};

const dateSelect = document.getElementById("dateSelect");
const generateBtn = document.getElementById("generateBtn");
const popup = document.getElementById("briefingPopup");
const briefingText = document.getElementById("briefingText");

fetch(SHEET_CSV)
  .then(res => res.text())
  .then(csv => {
    scheduleData = parseCSV(csv);
    populateDates();
  });

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines.shift().split(",").map(h => h.trim());
  const data = {};

  lines.forEach(line => {
    const row = line.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]?.trim());

    const date = obj.Date;
    if (!date) return;

    if (!data[date]) data[date] = [];
    data[date].push({
      name: obj.Name,
      area: obj.Area,
      entry: obj.Entry,
      exit: obj.Exit
    });
  });

  return data;
}

function populateDates() {
  Object.keys(scheduleData).forEach(date => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    dateSelect.appendChild(option);
  });
}

generateBtn.onclick = () => {
  const date = dateSelect.value;
  if (!date) return;
  briefingText.textContent = generateBriefing(date);
  popup.style.display = "flex";
};

document.getElementById("closeBtn").onclick = () => popup.style.display = "none";
document.getElementById("copyBtn").onclick = () =>
  navigator.clipboard.writeText(briefingText.textContent);

function generateBriefing(date) {
  const staff = scheduleData[date];

  const salaAll = staff.filter(s => s.area === "Sala");
  const salaOperational = salaAll.filter(
    s => s.name.toLowerCase() !== "ana"
  );
  const bar = staff.filter(s => s.area === "Bar");

  salaOperational.sort((a,b)=>a.entry.localeCompare(b.entry));
  bar.sort((a,b)=>a.entry.localeCompare(b.entry));

  // Porta
  const porta =
    salaAll.find(s => s.name.toLowerCase() === "ana") || salaOperational[0];

  // BAR lines
  let barLines = [`${bar[0].entry} Abertura Sala/Bar: ${bar[0].name}`];
  bar.forEach((b,i)=>{
    barLines.push(`${b.entry} Bar ${String.fromCharCode(65+i)}: ${b.name}`);
  });

  // BAR HACCP
  const barExit = [...bar].sort((a,b)=>a.exit.localeCompare(b.exit));
  let barHACCP = [];
  barHACCP.push(`${barExit[0].exit} Preparações Bar: ${barExit[0].name}`);

  if (barExit.length >= 3) {
    barHACCP.push(`${barExit[1].exit} Reposição Bar: ${barExit[1].name}`);
  } else {
    barHACCP.push(`${barExit[0].exit} Reposição Bar: ${barExit[0].name}`);
  }

  barHACCP.push(`${barExit.at(-1).exit} Limpeza Máquina / Reposição de Leites: ${barExit.at(-1).name}`);
  barHACCP.push(`${barExit.at(-1).exit} Fecho Bar: ${barExit.at(-1).name}`);

  // SALA HACCP (NO ANA)
  const salaExit = [...salaOperational].sort(
    (a,b)=>a.exit.localeCompare(b.exit)
  );

  let salaHACCP = [];

  if (salaExit.length === 1) {
    const s = salaExit[0];
    salaHACCP.push(`${s.exit} Fecho da sala de cima: ${s.name}`);
    salaHACCP.push(`${s.exit} Limpeza e reposição aparador/ cadeira de bebés: ${s.name}`);
    salaHACCP.push(`${s.exit} Repor papel (casa de banho): ${s.name}`);
    salaHACCP.push(`${s.exit} Limpeza casa de banho (clientes e staff): ${s.name}`);
    salaHACCP.push(`${s.exit} Limpeza vidros e Espelhos: ${s.name}`);
    salaHACCP.push(`${s.exit} Fecho da sala: ${s.name}`);
  }

  if (salaExit.length === 2) {
    salaHACCP.push(`${salaExit[0].exit} Fecho da sala de cima: ${salaExit[0].name}`);
    salaHACCP.push(`${salaExit[0].exit} Limpeza e reposição aparador/ cadeira de bebés: ${salaExit[0].name}`);
    salaHACCP.push(`${salaExit[0].exit} Repor papel (casa de banho): ${salaExit[0].name}`);
    salaHACCP.push(`${salaExit[0].exit} Limpeza casa de banho (clientes e staff): ${salaExit[0].name}`);
    salaHACCP.push(`${salaExit[1].exit} Limpeza vidros e Espelhos: ${salaExit[1].name}`);
    salaHACCP.push(`${salaExit[1].exit} Fecho da sala: ${salaExit[1].name}`);
  }

  if (salaExit.length >= 3) {
    salaHACCP.push(`${salaExit[0].exit} Fecho da sala de cima: ${salaExit[0].name}`);
    salaHACCP.push(`${salaExit[0].exit} Limpeza e reposição aparador/ cadeira de bebés: ${salaExit[0].name}`);
    salaHACCP.push(`${salaExit[0].exit} Repor papel (casa de banho): ${salaExit[0].name}`);
    salaHACCP.push(`${salaExit[1].exit} Limpeza casa de banho (clientes e staff): ${salaExit[1].name}`);
    salaHACCP.push(`${salaExit[1].exit} Limpeza vidros e Espelhos: ${salaExit[1].name}`);
    salaHACCP.push(`${salaExit.at(-1).exit} Fecho da sala: ${salaExit.at(-1).name}`);
  }

  // FECHO CAIXA
  const priority = ["carlos","prabhu","ana"];
  const fecho =
    priority.find(p => bar.some(b => b.name.toLowerCase() === p))
    || barExit.at(-1).name;

  return `Bom dia a todos!

*BRIEFING ${date}*

${porta.entry} Porta: ${porta.name}

BAR:
${barLines.join("\n")}

⸻⸻⸻⸻

‼️ Loiça é responsabilidade de todos.
NÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO
——————————————

HACCP / LIMPEZA BAR:
${barHACCP.join("\n")}

HACCP / SALA:
${salaHACCP.join("\n")}

${barExit.at(-1).exit} Fecho de Caixa: ${fecho.charAt(0).toUpperCase()+fecho.slice(1)}`;
}