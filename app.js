// ------------------- PRE-FILLED STAFF -------------------
const staffArray = [
  { name: "Ana", area: "SALA", access: "Manager" },
  { name: "David", area: "SALA", access: "User" },
  { name: "Julieta", area: "SALA", access: "User" },
  { name: "Prabhu", area: "SALA", access: "User" },
  { name: "Carlos", area: "BAR", access: "Manager" },
  { name: "Gonçalo", area: "BAR", access: "User" },
  { name: "Leonor", area: "BAR", access: "User" },
  { name: "Carol", area: "BAR", access: "User" }
];

// DOM ELEMENTS
const employeeSelect = document.getElementById("employeeSelect");
const entryTimeSelect = document.getElementById("entryTimeSelect");
const exitTimeSelect = document.getElementById("exitTimeSelect");
const generateBtn = document.getElementById("generateBtn");
const briefingPopup = document.getElementById("briefingPopup");
const briefingText = document.getElementById("briefingText");
const copyBtn = document.getElementById("copyBtn");
const closeBtn = document.getElementById("closeBtn");

// Populate Employee Dropdown
staffArray.forEach(staff => {
  const opt = document.createElement("option");
  opt.value = staff.name;
  opt.textContent = staff.name;
  employeeSelect.appendChild(opt);
});

// Populate time dropdowns with half-hour increments
function generateTimeOptions(startHour, endHour, elementId, allowHalf=true){
  const select = document.getElementById(elementId);
  for(let h=startHour; h<=endHour; h++){
    ["00","30"].forEach(min=>{
      if(h===endHour && min==="30" && !allowHalf) return;
      if(elementId==="entryTimeSelect" && h===endHour && min==="30") return; // Entry last at full hour
      const time = h.toString().padStart(2,"0")+":"+min;
      const opt = document.createElement("option");
      opt.value = time;
      opt.textContent = time;
      select.appendChild(opt);
    });
  }
}

// Entry 07:00 - 12:00
generateTimeOptions(7,12,"entryTimeSelect");
// Exit 14:00 - 18:30
generateTimeOptions(14,18,"exitTimeSelect");

// Generate briefing
generateBtn.addEventListener("click", ()=>{
  const emp = employeeSelect.value;
  const area = document.getElementById("areaSelect").value;
  const entry = entryTimeSelect.value;
  const exit = exitTimeSelect.value;

  const text = `
Bom dia a todos!

*BRIEFING*

${entry} - ${emp}: ${area}
${exit} - ${emp} leaves

⸻⸻⸻⸻

⚠ Please follow your area responsibilities
`;

  briefingText.innerText = text;
  briefingPopup.style.display = "flex";
});

// Copy & Close
copyBtn.addEventListener("click", ()=>{
  navigator.clipboard.writeText(briefingText.innerText);
  alert("Briefing copied!");
});

closeBtn.addEventListener("click", ()=>{
  briefingPopup.style.display = "none";
});