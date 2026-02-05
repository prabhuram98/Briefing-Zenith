// Elements
const dateSelect = document.getElementById("dateSelect");
const generateBtn = document.getElementById("generateBtn");
const briefingPopup = document.getElementById("briefingPopup");
const briefingText = document.getElementById("briefingText");
const copyBtn = document.getElementById("copyBtn");
const closeBtn = document.getElementById("closeBtn");

let scheduleData = {};

// Load JSON
fetch('data.json')
  .then(res => res.json())
  .then(data => {
    scheduleData = data;
    Object.keys(scheduleData).forEach(date => {
      const opt = document.createElement("option");
      opt.value = date;
      opt.textContent = date;
      dateSelect.appendChild(opt);
    });
  });

// Utility: round time to HH:00 or HH:30
function roundTimeToHalfHour(timeStr) {
  let [h, m] = timeStr.split(":").map(Number);
  if (m >= 30) m = 30; else m = 0;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// Generate briefing
generateBtn.addEventListener("click", () => {
  const selectedDate = dateSelect.value;
  const staffList = scheduleData[selectedDate] || [];

  const salaStaff = staffList.filter(s => s.area.toUpperCase() === "SALA");
  const barStaff = staffList.filter(s => s.area.toUpperCase() === "BAR");

  // Porta → Ana or earliest Sala staff
  let portaStaff = staffList.find(s => s.name.toLowerCase() === "ana");
  if(!portaStaff && salaStaff.length > 0) portaStaff = salaStaff[0];

  // BAR section: sort by entry time ascending
  const barSorted = barStaff.sort((a,b) => a.entry.localeCompare(b.entry));

  // SELLERS: sort Sala by entry time ascending
  const salaSorted = salaStaff.sort((a,b) => a.entry.localeCompare(b.entry));

  // HACCP / LIMPEZA BAR: sort BAR by exit time ascending
  const barExitSorted = barStaff.sort((a,b) => a.exit.localeCompare(b.exit));

  // HACCP / SALA: sort Sala by exit time ascending
  const salaExitSorted = salaStaff.sort((a,b) => a.exit.localeCompare(b.exit));

  // RUNNERS → Julieta if present, else Todos
  const julieta = salaStaff.find(s => s.name.toLowerCase() === "julieta");

  // Fecho de Caixa → Carlos > Prabhu > Ana
  let fechoCaixa = barStaff.find(s => s.name.toLowerCase() === "carlos") 
                   || salaStaff.find(s => s.name.toLowerCase() === "prabhu") 
                   || staffList.find(s => s.name.toLowerCase() === "ana");

  // Start building briefing
  let text = "Bom dia a todos!\n\n";
  text += `*BRIEFING ${selectedDate}*\n\n`;

  // Porta
  text += portaStaff ? `${roundTimeToHalfHour(portaStaff.entry)} Porta: ${portaStaff.name}\n` : "";

  // BAR
  text += "BAR:\n";
  if(barSorted.length >= 1){
    text += `${roundTimeToHalfHour(barSorted[0].entry)} Abertura Sala/Bar: ${barSorted[0].name}\n`;
    text += `${roundTimeToHalfHour(barSorted[0].entry)} Bar A: ${barSorted[0].name}\n`;
  }
  if(barSorted.length >= 2){
    text += `${roundTimeToHalfHour(barSorted[1].entry)} Bar B: ${barSorted[1].name}\n`;
  }
  if(barSorted.length >=3){
    text += `${roundTimeToHalfHour(barSorted[2].entry)} Bar C: ${barSorted[2].name}\n`;
  }
  if(barSorted.length >=4){
    text += `${roundTimeToHalfHour(barSorted[3].entry)} Bar D: ${barSorted[3].name}\n`;
  }

  text += "\n⸻⸻⸻⸻\n\n";
  text += "‼️ Loiça é responsabilidade de todos.\n";
  text += "NÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO.\n";
  text += "——————————————\n\n";

  // SELLERS
  text += "SELLERS:\n";
  if(salaSorted.length >=1) text += `${roundTimeToHalfHour(salaSorted[0].entry)} Seller A: ${salaSorted[0].name}\n`;
  if(salaSorted.length >=2) text += `${roundTimeToHalfHour(salaSorted[1].entry)} Seller B: ${salaSorted[1].name}\n`;
  if(salaSorted.length >=3) text += `${roundTimeToHalfHour(salaSorted[2].entry)} Seller C: ${salaSorted[2].name}\n`;
  text += "\n⚠ Pastéis de Nata – Cada Seller na sua secção ⚠\n";
  text += "——————————————\n";
  text += "Seller A: Mesas 20 - 30\n";
  text += "Seller B & C: Mesas 1 - 12\n";
  text += "——————————————\n\n";

  // RUNNERS
  text += "RUNNERS:\n";
  text += julieta ? `Runner A e B: ${julieta.name}\n` : "Runner A e B: Todos\n";
  text += "——————————————\n\n";

  // HACCP / LIMPEZA BAR
  text += "HACCP / LIMPEZA BAR:\n";
  if(barExitSorted.length >=1) text += `${roundTimeToHalfHour(barExitSorted[0].exit)} Preparações Bar: ${barExitSorted[0].name}\n`;
  if(barExitSorted.length >=2) text += `${roundTimeToHalfHour(barExitSorted[1].exit)} Reposição Bar: ${barExitSorted[1].name}\n`;
  if(barExitSorted.length >=1) text += `${roundTimeToHalfHour(barExitSorted[barExitSorted.length-1].exit)} Limpeza Máquina de Café / Reposição de Leites: ${barExitSorted[barExitSorted.length-1].name}\n`;
  if(barExitSorted.length >=1) text += `${roundTimeToHalfHour(barExitSorted[0].exit)} Fecho Bar: ${barExitSorted[0].name}\n\n`;

  // HACCP / SALA
  text += "HACCP / SALA:\n";
  if(salaExitSorted.length >=1){
    text += `${roundTimeToHalfHour(salaExitSorted[0].exit)} Fecho da sala de cima: ${salaExitSorted[0].name}\n`;
    text += `${roundTimeToHalfHour(salaExitSorted[0].exit)} Limpeza e reposição aparador/ cadeira de bebés: ${salaExitSorted[0].name}\n`;
  }
  if(salaExitSorted.length >=2){
    text += `${roundTimeToHalfHour(salaExitSorted[1].exit)} Repor papel (casa de banho): ${salaExitSorted[1].name}\n`;
    text += `${roundTimeToHalfHour(salaExitSorted[1].exit)} Limpeza casa de banho (clientes e staff): ${barExitSorted.length>=2 ? barExitSorted[1].name : ""}\n`;
  }
  if(salaExitSorted.length >=1){
    text += `${roundTimeToHalfHour(salaExitSorted[salaExitSorted.length-1].exit)} Limpeza vidros e Espelhos: ${salaExitSorted[salaExitSorted.length-1].name}\n`;
    text += `${roundTimeToHalfHour(salaExitSorted[salaExitSorted.length-1].exit)} Fecho da sala: ${salaExitSorted[salaExitSorted.length-1].name}\n`;
  }

  // Fecho de Caixa
  if(fechoCaixa) text += `17:30 Fecho de Caixa: ${fechoCaixa.name}\n`;

  briefingText.innerText = text;
  briefingPopup.style.display = "flex";
});

// Copy & Close
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(briefingText.innerText);
  alert("Briefing copied!");
});

closeBtn.addEventListener("click", () => {
  briefingPopup.style.display = "none";
});