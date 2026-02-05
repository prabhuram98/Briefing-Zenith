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

// Round time to HH:00 or HH:30
function roundTimeToHalfHour(timeStr){
  if(!timeStr) return "N/A";
  let [h,m] = timeStr.split(":").map(Number);
  m = m >=30 ? 30 : 0;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// Generate briefing
generateBtn.addEventListener("click", () => {
  const selectedDate = dateSelect.value;
  const staffList = scheduleData[selectedDate] || [];

  const salaStaff = staffList.filter(s => s.area.toUpperCase() === "SALA");
  const barStaff = staffList.filter(s => s.area.toUpperCase() === "BAR");

  // Sort by entry and exit
  const salaSortedEntry = salaStaff.sort((a,b)=> a.entry.localeCompare(b.entry));
  const barSortedEntry = barStaff.sort((a,b)=> a.entry.localeCompare(b.entry));
  const salaSortedExit = salaStaff.sort((a,b)=> a.exit.localeCompare(b.exit));
  const barSortedExit = barStaff.sort((a,b)=> a.exit.localeCompare(b.exit));

  // Porta line
  const portaStaff = staffList.find(s=>s.name.toLowerCase()==="ana") || salaSortedEntry[0];
  const PORTA_LINE = portaStaff ? `${roundTimeToHalfHour(portaStaff.entry)} Porta: ${portaStaff.name}` : "N/A Porta: N/A";

  // BAR section lines
  const BAR_LINE_1 = barSortedEntry[0] ? `${roundTimeToHalfHour(barSortedEntry[0].entry)} Abertura Sala/Bar: ${barSortedEntry[0].name}` : "N/A Abertura Sala/Bar: N/A";
  const BAR_LINE_2 = barSortedEntry[0] ? `${roundTimeToHalfHour(barSortedEntry[0].entry)} Bar A: ${barSortedEntry[0].name}` : "N/A Bar A: N/A";
  const BAR_LINE_3 = barSortedEntry[1] ? `${roundTimeToHalfHour(barSortedEntry[1].entry)} Bar B: ${barSortedEntry[1].name}` : "N/A Bar B: N/A";
  const BAR_LINE_4 = barSortedEntry[2] ? `${roundTimeToHalfHour(barSortedEntry[2].entry)} Bar C: ${barSortedEntry[2].name}` : "N/A Bar C: N/A";
  const BAR_LINE_5 = barSortedEntry[3] ? `${roundTimeToHalfHour(barSortedEntry[3].entry)} Bar D: ${barSortedEntry[3].name}` : "N/A Bar D: N/A";

  // SELLERS
  const SELLER_LINE_1 = salaSortedEntry[0] ? `${roundTimeToHalfHour(salaSortedEntry[0].entry)} Seller A: ${salaSortedEntry[0].name}` : "N/A Seller A: N/A";
  const SELLER_LINE_2 = salaSortedEntry[1] ? `${roundTimeToHalfHour(salaSortedEntry[1].entry)} Seller B: ${salaSortedEntry[1].name}` : "N/A Seller B: N/A";
  const SELLER_LINE_3 = salaSortedEntry[2] ? `${roundTimeToHalfHour(salaSortedEntry[2].entry)} Seller C: ${salaSortedEntry[2].name}` : "N/A Seller C: N/A";

  // RUNNERS
  const julieta = salaStaff.find(s=>s.name.toLowerCase()==="julieta");
  const RUNNER_LINE = julieta ? `Runner A e B: ${julieta.name}` : "Runner A e B: Todos";

  // HACCP / LIMPEZA BAR
  let HACCP_BAR_LINE_1 = barSortedExit[0] ? `${roundTimeToHalfHour(barSortedExit[0].exit)} Preparações Bar: ${barSortedExit[0].name}` : "N/A Preparações Bar: N/A";
  let HACCP_BAR_LINE_2 = barSortedExit[1] ? `${roundTimeToHalfHour(barSortedExit[1].exit)} Reposição Bar: ${barSortedExit[1].name}` : "N/A Reposição Bar: N/A";
  let HACCP_BAR_LINE_3 = (!barSortedExit[1] && barSortedExit.length>=1) ? `${roundTimeToHalfHour(barSortedExit[barSortedExit.length-1].exit)} Limpeza Máquina de Café / Reposição de Leites: ${barSortedExit[barSortedExit.length-1].name}` : "N/A Limpeza Máquina de Café / Reposição de Leites: N/A";
  let HACCP_BAR_LINE_4 = barSortedExit.length>=1 ? `${roundTimeToHalfHour(barSortedExit[barSortedExit.length-1].exit)} Fecho Bar: ${barSortedExit[barSortedExit.length-1].name}` : "N/A Fecho Bar: N/A";

  // HACCP / SALA
  const HACCP_SALA_LINE_1 = salaSortedExit[0] ? `${roundTimeToHalfHour(salaSortedExit[0].exit)} Fecho da sala de cima: ${salaSortedExit[0].name}` : "N/A Fecho da sala de cima: N/A";
  const HACCP_SALA_LINE_2 = salaSortedExit[0] ? `${roundTimeToHalfHour(salaSortedExit[0].exit)} Limpeza e reposição aparador/ cadeira de bebés: ${salaSortedExit[0].name}` : "N/A Limpeza e reposição aparador/ cadeira de bebés: N/A";
  const HACCP_SALA_LINE_3 = salaSortedExit[1] ? `${roundTimeToHalfHour(salaSortedExit[1].exit)} Repor papel (casa de banho): ${salaSortedExit[1].name}` : "N/A Repor papel (casa de banho): N/A";
  const HACCP_SALA_LINE_4 = (salaSortedExit[1] && barSortedExit[1]) ? `${roundTimeToHalfHour(barSortedExit[1].exit)} Limpeza casa de banho (clientes e staff): ${barSortedExit[1].name}` : "N/A Limpeza casa de banho (clientes e staff): N/A";
  const HACCP_SALA_LINE_5 = salaSortedExit.length>=1 ? `${roundTimeToHalfHour(salaSortedExit[salaSortedExit.length-1].exit)} Limpeza vidros e Espelhos: ${salaSortedExit[salaSortedExit.length-1].name}` : "N/A Limpeza vidros e Espelhos: N/A";

  const FECHO_SALA_LINE = salaSortedExit.length>=1 ? `${roundTimeToHalfHour(salaSortedExit[salaSortedExit.length-1].exit)} Fecho da sala: ${salaSortedExit[salaSortedExit.length-1].name}` : "N/A Fecho da sala: N/A";

  // Fecho de Caixa
  let fechoCaixaStaff = barStaff.find(s=>s.name.toLowerCase()==="carlos") || salaStaff.find(s=>s.name.toLowerCase()==="prabhu") || staffList.find(s=>s.name.toLowerCase()==="ana");
  let fechoCaixaTime = barSortedExit.length ? roundTimeToHalfHour(barSortedExit[barSortedExit.length-1].exit) : "N/A";
  const FIC_LINE = `${fechoCaixaTime} Fecho de Caixa: ${fechoCaixaStaff ? fechoCaixaStaff.name : "N/A"}`;

  // Template
  let briefingTemplate = `
Bom dia a todos!

*BRIEFING ${selectedDate}*

${PORTA_LINE}

BAR:
${BAR_LINE_1}
${BAR_LINE_2}
${BAR_LINE_3}
${BAR_LINE_4}
${BAR_LINE_5}

⸻⸻⸻⸻

‼️ Loiça é responsabilidade de todos.
NÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO
——————————————

SELLERS:
${SELLER_LINE_1}
${SELLER_LINE_2}
${SELLER_LINE_3}

⚠ Pastéis de Nata – Cada Seller na sua secção ⚠
——————————————
Seller A: Mesas 20 - 30
Seller B & C: Mesas 1 - 12
——————————————

RUNNERS:
${RUNNER_LINE}

HACCP / LIMPEZA BAR:
${HACCP_BAR_LINE_1}
${HACCP_BAR_LINE_2}
${HACCP_BAR_LINE_3}
${HACCP_BAR_LINE_4}

HACCP / SALA:
${HACCP_SALA_LINE_1}
${HACCP_SALA_LINE_2}
${HACCP_SALA_LINE_3}
${HACCP_SALA_LINE_4}
${HACCP_SALA_LINE_5}
${FECHO_SALA_LINE}

${FIC_LINE}
`;

  briefingText.innerText = briefingTemplate.trim();
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