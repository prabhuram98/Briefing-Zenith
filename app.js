let scheduleData = {};

fetch("./data.json")
  .then(res => res.json())
  .then(data => {
    scheduleData = data;
    populateDates();
  })
  .catch(err => console.error("Failed to load data.json", err));

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

document.getElementById("closeBtn").onclick = () => {
  popup.style.display = "none";
};

document.getElementById("copyBtn").onclick = () => {
  navigator.clipboard.writeText(briefingText.textContent);
};

function generateBriefing(date) {
  const staff = scheduleData[date];

  const sala = staff.filter(s => s.area === "Sala")
                    .sort((a,b)=>a.entry.localeCompare(b.entry));
  const bar = staff.filter(s => s.area === "Bar")
                   .sort((a,b)=>a.entry.localeCompare(b.entry));

  // Porta
  const porta = sala.find(s => s.name.toLowerCase() === "ana") || sala[0];

  // BAR lines
  let barLines = [`${bar[0].entry} Abertura Sala/Bar: ${bar[0].name}`];
  bar.forEach((b,i)=>{
    barLines.push(`${b.entry} Bar ${String.fromCharCode(65+i)}: ${b.name}`);
  });

  // HACCP BAR
  const barExit = [...bar].sort((a,b)=>a.exit.localeCompare(b.exit));
  let barHACCP = [];
  barHACCP.push(`${barExit[0].exit} Preparações Bar: ${barExit[0].name}`);

  if (barExit.length >= 3) {
    barHACCP.push(`${barExit[1].exit} Reposição Bar: ${barExit[1].name}`);
  } else {
    barHACCP.push(`${barExit[0].exit} Reposição Bar: ${barExit[0].name}`);
  }

  barHACCP.push(`${barExit.at(-1).exit} Limpeza Máquina de Café / Reposição de Leites: ${barExit.at(-1).name}`);
  barHACCP.push(`${barExit.at(-1).exit} Fecho Bar: ${barExit.at(-1).name}`);

  // HACCP SALA
  const salaExit = [...sala].sort((a,b)=>a.exit.localeCompare(b.exit));
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

  // Fecho de Caixa
  const priority = ["carlos","prabhu","ana"];
  let fecho = priority.find(p => bar.some(b => b.name.toLowerCase() === p)) || barExit.at(-1).name;

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