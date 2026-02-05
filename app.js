const dateSelect = document.getElementById("dateSelect");
const generateBtn = document.getElementById("generateBtn");
const briefingPopup = document.getElementById("briefingPopup");
const briefingText = document.getElementById("briefingText");
const copyBtn = document.getElementById("copyBtn");
const closeBtn = document.getElementById("closeBtn");

let scheduleData = {};

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

function roundTimeToHalfHour(timeStr){
  if(!timeStr) return "";
  let [h,m] = timeStr.split(":").map(Number);
  m = m >= 30 ? 30 : 0;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

generateBtn.addEventListener("click", () => {
  const selectedDate = dateSelect.value;
  const staffList = scheduleData[selectedDate] || [];

  const salaStaff = staffList.filter(s => s.area.toUpperCase() === "SALA");
  const barStaff = staffList.filter(s => s.area.toUpperCase() === "BAR");

  const salaSortedEntry = salaStaff.sort((a,b)=> a.entry.localeCompare(b.entry));
  const barSortedEntry = barStaff.sort((a,b)=> a.entry.localeCompare(b.entry));
  const salaSortedExit = salaStaff.sort((a,b)=> a.exit.localeCompare(b.exit));
  const barSortedExit = barStaff.sort((a,b)=> a.exit.localeCompare(b.exit));

  const portaStaff = staffList.find(s=>s.name.toLowerCase()==="ana") || salaSortedEntry[0];
  const PORTA_LINE = `${roundTimeToHalfHour(portaStaff.entry)} Porta: ${portaStaff.name}`;

  // BAR lines
  let barLines = [];
  barLines.push(barSortedEntry[0] ? `${roundTimeToHalfHour(barSortedEntry[0].entry)} Abertura Sala/Bar: ${barSortedEntry[0].name}` : "");
  barLines.push(barSortedEntry[0] ? `${roundTimeToHalfHour(barSortedEntry[0].entry)} Bar A: ${barSortedEntry[0].name}` : "");
  barLines.push(barSortedEntry[1] ? `${roundTimeToHalfHour(barSortedEntry[1].entry)} Bar B: ${barSortedEntry[1].name}` : "");
  barLines.push(barSortedEntry[2] ? `${roundTimeToHalfHour(barSortedEntry[2].entry)} Bar C: ${barSortedEntry[2].name}` : "");
  barLines.push(barSortedEntry[3] ? `${roundTimeToHalfHour(barSortedEntry[3].entry)} Bar D: ${barSortedEntry[3].name}` : "");

  // SELLERS
  let filteredSalaForSellers = salaSortedEntry.filter(s => s.name.toLowerCase() !== "ana");
  const sellerLines = [
    filteredSalaForSellers[0] ? `${roundTimeToHalfHour(filteredSalaForSellers[0].entry)} Seller A: ${filteredSalaForSellers[0].name}` : "",
    filteredSalaForSellers[1] ? `${roundTimeToHalfHour(filteredSalaForSellers[1].entry)} Seller B: ${filteredSalaForSellers[1].name}` : "",
    filteredSalaForSellers[2] ? `${roundTimeToHalfHour(filteredSalaForSellers[2].entry)} Seller C: ${filteredSalaForSellers[2].name}` : ""
  ];

  const julieta = salaStaff.find(s=>s.name.toLowerCase()==="julieta");
  const RUNNER_LINE = julieta ? `Runner A e B: ${julieta.name}` : "Runner A e B: Todos";

  // HACCP BAR fix: Fecho Bar correct
  let preparacoesBar = barSortedExit[0];
  let reposicaoBar = barSortedExit[1] || null;
  let limpezaMaquina = (!reposicaoBar && barSortedExit.length>0) ? barSortedExit[barSortedExit.length-1] : null;

  // Fecho Bar: last exiting BAR staff, if multiple exit same time, prioritize Carlos
  let lastExitTime = Math.max(...barSortedExit.map(s=>parseInt(s.exit.replace(":",""))));
  let fechoBarCandidates = barSortedExit.filter(s=>parseInt(s.exit.replace(":","")) === lastExitTime);
  let fechoBar = fechoBarCandidates.find(s=>s.name.toLowerCase()==="carlos") || fechoBarCandidates[fechoBarCandidates.length-1];

  const HACCP_BAR_LINE_1 = preparacoesBar ? `${roundTimeToHalfHour(preparacoesBar.exit)} Preparações Bar: ${preparacoesBar.name}` : "";
  const HACCP_BAR_LINE_2 = reposicaoBar ? `${roundTimeToHalfHour(reposicaoBar.exit)} Reposição Bar: ${reposicaoBar.name}` : "";
  const HACCP_BAR_LINE_3 = limpezaMaquina ? `${roundTimeToHalfHour(limpezaMaquina.exit)} Limpeza Máquina de Café / Reposição de Leites: ${limpezaMaquina.name}` : "";
  const HACCP_BAR_LINE_4 = fechoBar ? `${roundTimeToHalfHour(fechoBar.exit)} Fecho Bar: ${fechoBar.name}` : "";

  // HACCP SALA
  const HACCP_SALA_LINE_1 = salaSortedExit[0] ? `${roundTimeToHalfHour(salaSortedExit[0].exit)} Fecho da sala de cima: ${salaSortedExit[0].name}` : "";
  const HACCP_SALA_LINE_2 = salaSortedExit[0] ? `${roundTimeToHalfHour(salaSortedExit[0].exit)} Limpeza e reposição aparador/ cadeira de bebés: ${salaSortedExit[0].name}` : "";
  const HACCP_SALA_LINE_3 = salaSortedExit[1] ? `${roundTimeToHalfHour(salaSortedExit[1].exit)} Repor papel (casa de banho): ${salaSortedExit[1].name}` : "";
  const HACCP_SALA_LINE_4 = barSortedExit[1] ? `${roundTimeToHalfHour(barSortedExit[1].exit)} Limpeza casa de banho (clientes e staff): ${barSortedExit[1].name}` : "";
  const HACCP_SALA_LINE_5 = salaSortedExit[salaSortedExit.length-1] ? `${roundTimeToHalfHour(salaSortedExit[salaSortedExit.length-1].exit)} Limpeza vidros e Espelhos: ${salaSortedExit[salaSortedExit.length-1].name}` : "";

  const FECHO_SALA_LINE = salaSortedExit[salaSortedExit.length-1] ? `${roundTimeToHalfHour(salaSortedExit[salaSortedExit.length-1].exit)} Fecho da sala: ${salaSortedExit[salaSortedExit.length-1].name}` : "";

  // Fecho de Caixa
  let fechoCaixaStaff = barStaff.find(s=>s.name.toLowerCase()==="carlos") 
                     || salaStaff.find(s=>s.name.toLowerCase()==="prabhu") 
                     || staffList.find(s=>s.name.toLowerCase()==="ana");
  let fechoCaixaTime = barSortedExit.length ? roundTimeToHalfHour(barSortedExit[barSortedExit.length-1].exit) : "";
  const FIC_LINE = `${fechoCaixaTime} Fecho de Caixa: ${fechoCaixaStaff.name}`;

  const briefingTemplate = `
Bom dia a todos!

*BRIEFING ${selectedDate}*

${PORTA_LINE}

BAR:
${barLines.join("\n")}

⸻⸻⸻⸻

‼️ Loiça é responsabilidade de todos.
NÃO DEIXAR LOIÇA ACUMULAR EM NENHUM MOMENTO
——————————————

SELLERS:
${sellerLines.join("\n")}

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

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(briefingText.innerText);
  alert("Briefing copied!");
});

closeBtn.addEventListener("click", () => {
  briefingPopup.style.display = "none";
});
