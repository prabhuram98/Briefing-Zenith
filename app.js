let scheduleData = {};

fetch("data.json")
  .then(res => res.json())
  .then(data => {
    scheduleData = data;
    populateDates();
  });

const dateSelect = document.getElementById("dateSelect");
const generateBtn = document.getElementById("generateBtn");
const popup = document.getElementById("briefingPopup");
const briefingText = document.getElementById("briefingText");

function populateDates() {
  Object.keys(scheduleData).forEach(date => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    dateSelect.appendChild(option);
  });
}

generateBtn.addEventListener("click", () => {
  const date = dateSelect.value;
  if (!date) return;

  briefingText.textContent = generateBriefing(date);
  popup.style.display = "flex";
});

document.getElementById("closeBtn").onclick = () => popup.style.display = "none";
document.getElementById("copyBtn").onclick = () => {
  navigator.clipboard.writeText(briefingText.textContent);
};

function generateBriefing(date) {
  const staff = scheduleData[date];

  const sala = staff.filter(s => s.area === "Sala");
  const bar = staff.filter(s => s.area === "Bar");

  sala.sort((a,b)=>a.entry.localeCompare(b.entry));
  bar.sort((a,b)=>a.entry.localeCompare(b.entry));

  // Porta
  let porta = sala.find(s => s.name.toLowerCase() === "ana") || sala[0];

  // BAR stations
  let barLines = [];
  bar.forEach((b,i)=>{
    barLines.push(`${b.entry} Bar ${String.fromCharCode(65+i)}: ${b.name}`);
  });
  barLines.unshift(`${bar[0].entry} Abertura Sala/Bar: ${bar[0].name}`);

  // HACCP BAR
  const barByExit = [...bar].sort((a,b)=>a.exit.localeCompare(b.exit));
  let barHACCP = [];
  if (barByExit[0])
    barHACCP.push(`${barByExit[0].exit} Preparações Bar: ${barByExit[0].name}`);
  if (barByExit.length >= 3)
    barHACCP.push(`${barByExit[1].exit} Reposição Bar: ${barByExit[1].name}`);
  else
    barHACCP.push(`${barByExit[0].exit} Reposição Bar: ${barByExit[0].name}`);
  barHACCP.push(`${barByExit.at(-1).exit} Limpeza Máquina de Café / Reposição de Leites: ${barByExit.at(-1).name}`);
  barHACCP.push(`${barByExit.at(-1).exit} Fecho Bar: ${barByExit.at(-1).name}`);

  // HACCP SALA
  const salaByExit = [...sala].sort((a,b)=>a.exit.localeCompare(b.exit));
  let salaHACCP = [];

  if (salaByExit.length === 1) {
    const s = salaByExit[0];
    salaHACCP.push(`${s.exit} Fecho da sala de cima: ${s.name}`);
    salaHACCP.push(`${s.exit} Limpeza e reposição aparador/ cadeira de bebés: ${s.name}`);
    salaHACCP.push(`${s.exit} Repor papel (casa de banho): ${s.name}`);
    salaHACCP.push(`${s.exit} Limpeza casa de banho (clientes e staff): ${s.name}`);
    salaHACCP.push(`${s.exit} Limpeza vidros e Espelhos: ${s.name}`);
    salaHACCP.push(`${s.exit} Fecho da sala: ${s.name}`);
  }

  if (salaByExit.length === 2) {
    salaHACCP.push(`${salaByExit[0].exit} Fecho da sala de cima: ${salaByExit[0].name}`);
    salaHACCP.push(`${salaByExit[0].exit} Limpeza e reposição aparador/ cadeira de bebés: ${salaByExit[0].name}`);
    salaHACCP.push(`${salaByExit[0].exit} Repor papel (casa de banho): ${salaByExit[0].name}`);
    salaHACCP.push(`${salaByExit[0].exit} Limpeza casa de banho (clientes e staff): ${salaByExit[0].name}`);
    salaHACCP.push(`${salaByExit[1].exit} Limpeza vidros e Espelhos: ${salaByExit[1].name}`);
    salaHACCP.push(`${salaByExit[1].exit} Fecho da sala: ${salaByExit[1].name}`);
  }

  if (salaByExit.length >= 3) {
    salaHACCP.push(`${salaByExit[0].exit} Fecho da sala de cima: ${salaByExit[0].name}`);
    salaHACCP.push(`${salaByExit[0].exit} Limpeza e reposição aparador/ cadeira de bebés: ${salaByExit[0].name}`);
    salaHACCP.push(`${salaByExit[0].exit} Repor papel (casa de banho): ${salaByExit[0].name}`);
    salaHACCP.push(`${salaByExit[1].exit} Limpeza casa de banho (clientes e staff): ${salaByExit[1].name}`);
    salaHACCP.push(`${salaByExit[1].exit} Limpeza vidros e Espelhos: ${salaByExit[1].name}`);
    salaHACCP.push(`${salaByExit.at(-1).exit} Fecho da sala: ${salaByExit.at(-1).name}`);
  }

  // Fecho Caixa
  const priority = ["carlos","prabhu","ana"];
  let fecho = priority.find(p => bar.some(b=>b.name.toLowerCase()===p)) || bar.at(-1).name;

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

${bar.at(-1).exit} Fecho de Caixa: ${fecho.charAt(0).toUpperCase()+fecho.slice(1)}`;
}